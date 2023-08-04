import express from "express";
import { Router } from "express";
import cartModel from "../Dao/mongoManager/models/cart.models.js";
import productModel from "../Dao/mongoManager/models/product.models.js"

const app = express();
const cartRouter = Router();

cartRouter.get("/", async(req, res) => {
  const carts = await cartModel.find().populate('products.id', 'title quantity').lean().exec();
  res.render("carts", { carts })
})

cartRouter.post("/", async (req, res) => {
  try {
    const result = await cartModel.create({products: []})
    console.log("Carrito creado");
    res.send(result)
  } catch (error) {
    console.log("Error:", error);
  }
});

cartRouter.get('/:cid', async (req, res) => {
  try {
    const cartId = req.params.cid;

    if (!cartId) {
      const newCart = await cartModel.create({ products: [] });
      res.json(newCart);
    } else {
      const cart = await cartModel.findById(cartId).lean().exec();
      res.render("cart", { cart }); 
    }
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ error: "Error al obtener el carrito" });
  }
});


cartRouter.get("/:cid/product/:pid", async (req, res) => {
  const cid = req.params.cid;
  const pid = req.params.pid;
  const quantity = parseInt(req.query.quantity) || 1;

  try {
    const product = await productModel.findById(pid);

    if (!product) {
      return res.status(404).send("Producto no encontrado");
    }
    const cart = await cartModel.findById(cid);
    const existingProduct = cart.products.find((product) => product.id === pid);

    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({
        id: pid,
        quantity,
        title: product.title,
      });
    }
    const result = await cart.save();
    res.send(result);
  } catch (error) {
    res.status(500).send("Error agregar el producto al carrito");
  }
});
cartRouter.delete('/:cid', async (req, res) => {
  const cartId = req.params.cid;
  try {
      const cart = await cartModel.findByIdAndRemove(cartId);
      if (cart) {
          console.log("El carrito se eliminó correctamente");
      } else {
          console.log("carrito a eliminar no encontrado");
      }
  } catch (error) {
      console.log(`Error al eliminar el carrito de la base de datos: ${error}`);
  }
});
cartRouter.delete("/:cid/products/:pid", async (req, res) => {
  const cartID = req.params.cid;
  const productID = req.params.pid;
  try {
    const cart = await cartModel.findById(cartID);
    if (!cart) {
      return res.status(404).json({ message: "Carrito no encontrado" });
    }

    const productIndex = cart.products.findIndex(
      (product) => product._id.toString() === productID
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Producto no encontrado en el carrito" });
    }

    cart.products.splice(productIndex, 1);

    const updatedCart = await cart.save();

    res.json({ message: "Producto eliminado del carrito correctamente", cart: updatedCart });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el producto del carrito", error: error.message });
  }
});

export default cartRouter;
