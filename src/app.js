import express from "express";
import handlebars from "express-handlebars"
import mongoose from "mongoose";
import { Server } from "socket.io";
import viewsRouter from "./routes/views.router.js"
import  productsRouter  from './routes/products.router.js';
import cartsRouter from "./routes/carts.router.js";
import __dirname from "./utils.js";
import productModel from "./Dao/mongoManager/models/product.models.js";
import chatModel from "./Dao/mongoManager/models/chat.models.js";
import chatRouter from "./routes/chat.router.js"

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}))

app.engine("handlebars", handlebars.engine());
app.set("views", __dirname + "/views");
app.set("view engine", "handlebars");

app.use("/static", express.static(__dirname + "/public"))
app.use("/", viewsRouter);
app.use('/api/products', productsRouter);
app.use('/api/carts', cartsRouter);
app.use("/chat", chatRouter )

const httpServer = app.listen(8080)
const io = new Server(httpServer)

const URL = "mongodb+srv://Marting1996:CL0vqopVI2y3bmFo@coderbackend.gettbop.mongodb.net/?retryWrites=true&w=majority"

mongoose.set("strictQuery", false)
const run = async () => {
    const products = await productModel.aggregate([
        //Filtrar por criterio
        {$match: {category: "frutas"}},
        //Ordenar por cantidad
        {$sort:{stock: -1}},
        //guardar resultado
        { $group: {
            _id: 1,
            products: {$push: "$$ROOT"}
        }},
        //Generamos un id
        {$project: {
            "_id": 0,
            products: "$products"
        }},
        //Agregamos a la coleccion
        /* {$merge: {
            into: "carts"
        }}  */
    ])
    //console.log(JSON.stringify(products, null, 2, "/t"));
}
mongoose.connect(URL, {dbName: "coderbackend"}).then(run)
const messageList = [];

io.on("connection", async (socket) => {
    console.log("New client connected");
    try {
        const messages = await chatModel.find().lean().exec();
        socket.emit("logs", messages);
    } catch (error) {
        console.error("Error al cargar los mensajes del chat:", error);
    }
    socket.on("message", async (data) => {
        try {
            const newMessage = new chatModel(data);
            await newMessage.save();
            io.emit("logs", [data]);
        } catch (error) {
            console.error("Error al guardar el mensaje en la base de datos:", error);
        }
    });
    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
    socket.on("new-product", async data => {
        try {
            const productExists = await productModel.exists({ code: data.code });

            if (productExists) {
                console.log("El producto ya existe");
                socket.emit("product-exists", { error: "El producto ya existe" });
            } else {
                const productGenerated = new productModel(data);
                await productGenerated.save();

                console.log("Producto agregado a la BD correctamente");
                socket.emit("product-added", { message: "Producto agregado a la BD correctamente" });
                const products_realtime = await productModel.find().lean().exec();
                io.emit("reload-table", products_realtime);
            }
        } catch (error) {
            console.log("Error al agregar el producto a la BD:", error);
            socket.emit("product-error", { error: "Error al agregar el producto" });
        }
    });

    socket.on("delete-product", async (productId) => {
        try {
            const validProductId = new mongoose.Types.ObjectId(productId);
            const deletedProduct = await productModel.findByIdAndRemove(validProductId);
            const products_realtime = await productModel.find().lean().exec();
            io.emit("reload-table", products_realtime);
    
            console.log("Producto eliminado correctamente:", deletedProduct);
        } catch (error) {
            console.log("Error al eliminar el producto de la base de datos:", error);
        }
    });
    
});

export default app;
