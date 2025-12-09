const express = require("express");
const { jwtAuthAdmin } = require("../middleware/jwtAuth");
const designerController = require("../controllers/designerController");
const designerRouter = express.Router();

/****************** Add Fabric For Admin *******************/
designerRouter.get("/order", jwtAuthAdmin, designerController.getDesignerOrder);
designerRouter.get(
  "/order/:id",
  jwtAuthAdmin,
  designerController.getOrderDetails
);
designerRouter.post("/expense", jwtAuthAdmin, designerController.createExpense);
designerRouter.put(
  "/expense/:id",
  jwtAuthAdmin,
  designerController.updateExpense
);
designerRouter.delete(
  "/expense/:id",
  jwtAuthAdmin,
  designerController.deleteExpense
);
designerRouter.get("/expense", jwtAuthAdmin, designerController.getExpenses);
designerRouter.get("/sales", jwtAuthAdmin, designerController.getSales);
designerRouter.post(
  "/custom-styles",
  jwtAuthAdmin,
  designerController.createOrUpdateStyle
);
designerRouter.get(
  "/custom-styles",
  jwtAuthAdmin,
  designerController.getCustomStyles
);
designerRouter.post("/add-to-cart", jwtAuthAdmin, designerController.addtoCart);
designerRouter.get("/cart", jwtAuthAdmin, designerController.getCart);
/****************** Add Fabric For Admin For Starting Page *******************/

//getTopCustomersByOrders
designerRouter.get(
  "/top-customer",
  jwtAuthAdmin,
  designerController.getTopCustomersByOrders
);

designerRouter.get(
  "/ordersPagination",
  jwtAuthAdmin,
  designerController.getDesignerOrderWithPagination
);

designerRouter.get(
  "/orderInfo",
  jwtAuthAdmin,
  designerController.getDesignerOrderInfo
);

module.exports = designerRouter;
