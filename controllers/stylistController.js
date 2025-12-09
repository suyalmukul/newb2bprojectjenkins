const SuperadminProduct = require("../models/QuickorderNew_pro_sub");
const SuperadminMesurment = require("../models/QuickorderNew_Measurment");
const Product = require("../models/Product");
const Style = require("../models/Style");
const Contrast = require("../models/Contrast");
const Measurement = require("../models/Measurement");
const SpecialInstruction = require("../models/special_instruction");
const Cart = require("../models/cart");
const Order = require("../models/order");
const Fabrics = require("../models/fabric");
const fabricService = require("../services/fabric.service");
const Store = require("../models/stores");
const authService = require("../services/auth.services");
const WorkerStatus = require("../models/worker_status");
const { catchAsyncError } = require("../middleware/catchAsyncError");

const mongoose = require("mongoose");
const StylistAppointment = require("../models/StylistAppointments.model");
const { sendSMS } = require("../utils/sns.service");
const { getIO } = require("../utils/setupSocket");
const { sendEmailViaOneSignal } = require("../services/email.services");
const Otp = require("../models/otp");
const bcrypt = require("bcryptjs");
const { saveAddresses } = require("../utils/stylist");
const { sendPushNotification } = require("../utils/pushNotifcation");
const { updateMostPurchasedCategories } = require("../utils/products");
const PurchasedCategory = require("../models/PurchasedCategory");
const ProductAlteration = require("../models/productAlteration");
const MeasureAlteration = require("../models/measurementAlteration");
const SpecialInstructionAlteration = require("../models/specialInstructionAlteration");
const OnlineCustomerB2C = require("../models/Customerb2c.online");
const axios = require("axios");
const OnlineCustomers = require("../models/OnlineCustomers.model");
const CustomerInvoice = require("../models/Customer_Bill_Invoice");
const CustomerProduct = require("../models/customerProduct");
const QuickOrderStatus = require("../models/quickorderStatus.model");

//search superadmin product

const searchSuperadminProducts = async (req, res) => {
  try {
    const { gender, categoryName, id, search } = req.query;

    let query = {};

    // If `id` is provided, prioritize it for finding a specific product.
    if (id) {
      query["_id"] = id;
    } else {
      if (gender) {
        query["gender.name"] = gender;
      }

      if (categoryName) {
        query["gender.categories.name"] = categoryName;
      }

      // Add exact match functionality for category names, ensuring an exact match
      // if (search) {
      //   query["gender.categories.name"] = {
      //     $regex: `^${search}$`,
      //     $options: "i", // Case-insensitive match
      //   };
      // }

      if (search) {
        query["$or"] = [
          {
            "gender.categories.name": {
              $regex: search,
              $options: "i",
            },
          },
          {
            name: {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }
    }

    const allProducts = await SuperadminProduct.find(query);

    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      allProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

//search superadmin mesurment

const searchSuperadminMeasurements = async (req, res) => {
  try {
    const { gender, categoriename, id, search } = req.query;

    let query = {};

    // If `id` is provided, prioritize it for finding a specific product.
    if (id) {
      query["_id"] = id;
    } else {
      if (gender) {
        query["gender"] = gender;
      }

      if (categoriename) {
        query["categoriename"] = categoriename;
      }

      // Add exact match functionality for category names, ensuring an exact match
      if (search) {
        query["categoriename"] = {
          $regex: `^${search}$`,
          $options: "i", // Case-insensitive match
        };
      }
    }

    const allMesurments = await SuperadminMesurment.find(query);

    res.status(200).json({
      success: true,
      message: "Mesurment retrieved successfully",
      allMesurments,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// search fabric

const searchSuperadminFabrics = async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 15;
  const page = parseInt(req.query.page) || 1;
  let { pipeline, countPipeline, totalCount } =
    await fabricService.getFabricPipeline(req.query, page, limit);
  req.query.createdBy = "lovoj";

  const fabrics = await Fabrics.aggregate(pipeline);

  const countResult = await Fabrics.aggregate(countPipeline);

  totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

  const showingResults = {
    from: (page - 1) * limit + 1,
    to: Math.min(page * limit, totalCount),
  };

  res.status(200).json({
    success: true,
    message: "Your Fabric lists",
    totalCount,
    page,
    showingResults,
    fabrics,
  });
};

//

const searchDesignerCreation = async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 15;
  const page = parseInt(req.query.page) || 1;

  let { pipeline, countPipeline, totalCount } =
    await fabricService.getStoreFabricPipeline(req.query, page, limit);

  let stores = [];

  stores = await Store.aggregate(pipeline);

  const countResult = await Store.aggregate(countPipeline);

  totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

  const showingResults = {
    from: (page - 1) * limit + 1,
    to: Math.min(page * limit, totalCount),
  };
  // stores = await fabricService.getFabricImagesOfStores(stores);
  return res.status(200).json({
    success: true,
    message: "Store with fabricImages",
    totalCount,
    page,
    showingResults,
    stores,
  });
};

/************************************* Add Data *******************************/

// const addData = async (req, res) => {
//   const {
//     product = {},
//     styles = [],
//     stylist_id,
//     customer_id,
//     type,
//     is_selected,
//     created_by = "stylist",
//     quantity
//   } = req.body;

//   try {
//     const productId = product._id || ((await new Product(product).save())._id);

//     const saveStyles = async (styles, productId) => {
//       if (styles.length) {
//         const result = await Style.insertMany(styles.map(item => ({ ...item, product_id: productId })));
//         return { styles: result };
//       }
//     };

//     const results = {
//       ...(styles.length && await saveStyles(styles, productId))
//     };

//     if (stylist_id && customer_id && created_by) {
//       if (quantity) {
//         await new Cart({ product_id: productId, stylist_id, customer_id, type, quantity, is_selected, created_by }).save();
//       } else {
//         await new Cart({ product_id: productId, stylist_id, customer_id, created_by }).save();
//       }
//     }

//     res.status(201).json({ message: 'Data added successfully', data: results });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

const addProduct = async (req, res) => {
  const stylist_id = req.user._id;
  const {
    products = [], // Accept an array of products
    // stylist_id,
    customer_id,
    is_selected,
    created_by = "stylist",
    appointment_id,
  } = req.body;
  try {
    // Loop through each product in the array
    const results = await Promise.all(
      products.map(async (productData) => {
        const { product = {}, styles = [], quantity } = productData;

        // Save the product if it doesn't have an _id
        const productId =
          product._id || (await new Product(product).save())._id;

        // Save associated styles if any
        const saveStyles = async (styles, productId) => {
          if (styles.length) {
            const result = await Style.insertMany(
              styles.map((item) => ({ ...item, product_id: productId }))
            );
            return { styles: result };
          }
        };
        console.log(saveStyles, "saveStyles...........");
        const productResults = {
          ...(styles.length && (await saveStyles(styles, productId))),
        };
        // const productResults = async (styles, productId) => {
        //   const result = [];
        //   for (const style of styles) {
        //     if (style._id) {
        //       // Update existing style
        //       const updated = await Style.findByIdAndUpdate(
        //         style._id,
        //         { ...style, product_id: productId },
        //         { new: true }
        //       );
        //       result.push(updated);
        //     } else {
        //       // Create new style
        //       const created = await new Style({
        //         ...style,
        //         product_id: productId,
        //       }).save();
        //       result.push(created);
        //     }
        //   }
        //   return { styles: result };
        // };

        // Save the product in the cart
        if (stylist_id && customer_id && created_by) {
          console.log("qdjwhduiwhduihuydfhguyfehgbyufewufd");
          if (quantity) {
            await new Cart({
              product_id: productId,
              stylist_id,
              customer_id,
              quantity,
              is_selected,
              created_by,
              appointment_id,
            }).save();
          } else {
            await new Cart({
              product_id: productId,
              stylist_id,
              customer_id,
              created_by,
              appointment_id,
            }).save();
          }
        }

        return { productId, ...productResults };
      })
    );

    console.log({ results });

    res.status(201).json({ message: "Data added successfully", data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/********************************* Update Data ******************************/

const updateProduct = async (req, res) => {
  const stylist_id = req.user._id;
  const {
    products = [],
    customer_id,
    is_selected,
    created_by = "stylist",
  } = req.body;

  try {
    const results = await Promise.all(
      products.map(async (productData) => {
        const { product = {}, styles = [], quantity } = productData;
        let productId = product._id;

        if (productId) {
          // Update existing product
          await Product.findByIdAndUpdate(
            productId,
            { $set: product },
            { new: true }
          );
        } else {
          return {
            error: "Product ID is required for updating an existing product",
          };
        }

        // Update existing styles (Find and update styles instead of deleting and inserting new ones)
        await Promise.all(
          styles.map(async (style) => {
            await Style.findOneAndUpdate(
              { product_id: productId, name: style.name, type: style.type },
              { $set: { image: style.image } },
              { upsert: true, new: true }
            );
          })
        );

        // Update existing cart entry if it exists
        const cartQuery = {
          product_id: productId,
          stylist_id,
          customer_id,
          created_by,
        };
        const cartUpdate = { quantity, is_selected };
        const existingCart = await Cart.findOne(cartQuery);

        if (existingCart) {
          await Cart.updateOne(cartQuery, { $set: cartUpdate });
        } else {
          return { error: "Cart entry does not exist for this product" };
        }

        return { productId };
      })
    );

    res
      .status(200)
      .json({ message: "Data updated successfully", data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/********************************** Update Data *****************************/

// const addProductContrastAndMeasurment = async (req, res) => {
//   const { product_id } = req.params;
//   const { productContrast = [], measurement = [] } = req.body;

//   const saveData = async (data, Model, key) => {
//     if (data.length) {
//       await Model.deleteMany({ product_id });
//       return { [key]: await Model.insertMany(data.map((item) => ({ ...item, product_id }))) };
//     }
//     return {};
//   };

//   try {
//     const results = {
//       ...(await saveData(productContrast, Contrast, "Contrast")),
//       ...(await saveData(measurement, Measurement, "measurement")),
//     };

//     res.status(200).json({ message: "Data updated successfully", data: results });
//   } catch (error) {
//     console.error("Error updating data:", error);
//     res.status(500).json({ error: error.message });
//   }
// };

// const addProductContrastAndMeasurment = async (req, res) => {
//   const {
//     productContrast = [],
//     measurement = [],
//     quantity,
//     stylist_id,
//     customer_id,
//     created_by = "stylist",
//     productData = {}, // New: Product data to update
//     styleData = [] // New: Style data to update
//   } = req.body;

//   const { product_id } = req.params;

//   const saveData = async (data, Model, key) => {
//     if (data.length) {
//       await Model.deleteMany({ product_id });
//       return { [key]: await Model.insertMany(data.map((item) => ({ ...item, product_id }))) };
//     }
//     return {};
//   };

//   const updateCart = async () => {
//     if (quantity) {
//       const cartItem = await Cart.findOne({ product_id, stylist_id, customer_id, created_by });
//       if (cartItem) {
//         cartItem.quantity = quantity;
//         await cartItem.save();
//       } else {
//         await new Cart({ product_id, stylist_id, customer_id, created_by, quantity }).save();
//       }
//     }
//   };

//   const updateProductData = async () => {
//     if (Object.keys(productData).length) {
//       const product = await Product.findById(product_id);
//       if (product) {
//         Object.assign(product, productData);
//         await product.save();
//       } else {
//         throw new Error(`Product with ID ${product_id} not found`);
//       }
//     }
//   };

//   const updateStyleData = async () => {
//     if (styleData.length) {
//       await Style.deleteMany({ product_id }); // Remove existing styles for the product
//       const newStyles = styleData.map((style) => ({ ...style, product_id }));
//       await Style.insertMany(newStyles); // Insert updated style data
//     }
//   };

//   try {
//     const results = {
//       ...(await saveData(productContrast, Contrast, 'Contrast')),
//       ...(await saveData(measurement, Measurement, 'measurement')),
//     };

//     await updateCart();
//     await updateProductData(); // Update Product data in Product collection
//     await updateStyleData();   // Update Style data in Style collection

//     res.status(200).json({ message: 'Data updated successfully', data: results });
//   } catch (error) {
//     console.error('Error updating data:', error);
//     res.status(500).json({ error: error.message });
//   }
// };

const addProductContrastAndMeasurment = async (req, res) => {
  const { product_id } = req.params;
  const {
    productContrast = [],
    measurement = [],
    specialInstruction = [],
    voice_notes,
    ready_made,
  } = req.body; // Added specialInstruction

  // Utility function to delete old data and insert new data
  const saveData = async (data, Model, key) => {
    if (data.length) {
      await Model.deleteMany({ product_id });
      return {
        [key]: await Model.insertMany(
          data.map((item) => ({ ...item, product_id }))
        ),
      };
    }
    return {};
  };

  try {
    const results = {
      ...(await saveData(productContrast, Contrast, "Contrast")),
      ...(await saveData(measurement, Measurement, "Measurement")),
      ...(await saveData(
        specialInstruction,
        SpecialInstruction,
        "SpecialInstruction"
      )), // Added SpecialInstruction
    };

    await Product.findOneAndUpdate(product_id, { ready_made, voice_notes });

    res
      .status(200)
      .json({ message: "Data updated successfully", data: results });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({ error: error.message });
  }
};

/************************************ Get Cart Data ****************************/

// const cartdata = async (req, res) => {
//   const { customer_id } = req.query;
//   const stylist_id = req.user._id;

//   try {
//     if (!customer_id) {
//       return res.status(400).json({ message: 'User ID is required.' });
//     }

//     const cartItems = await Cart.find({ customer_id, stylist_id })
//       .populate({
//         path: 'product_id',
//         populate: [
//           { path: 'fabric_id', },  // Populate fabric details
//           { path: 'store_id', },            // Populate store details
//           { path: 'category_id' },                         // Populate category details
//         ]
//       })
//       .lean(); // Convert Mongoose documents to plain objects

//     const enrichedCartItems = await Promise.all(
//       cartItems.map(async (cartItem) => {
//         const productId = cartItem.product_id._id;

//         // Find and populate fabric_id inside Contrast
//         const contrasts = await Contrast.find({ product_id: productId })
//           .populate('fabric_id', 'name image_url') // Populating fabric details inside Contrast
//           .lean();

//         const styles = await Style.find({ product_id: productId }).lean();

//         const contrastsPrice = contrasts.reduce((accumulator, currentValue) =>
//           accumulator + currentValue.price, 0);

//         const total_amount = cartItem.product_id.amount + contrastsPrice;

//         return {
//           product: cartItem.product_id,
//           styles,
//           contrasts,
//           total_amount
//         };
//       })
//     );

//     res.status(200).json({
//       message: 'Cart retrieved successfully.',
//       cart: enrichedCartItems,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

/******* */
const cartdata = async (req, res) => {
  const { appointment_id } = req.params;
  const stylist_id = req.user._id;

  try {
    const appointmentData = await StylistAppointment.findById(appointment_id);
    if (!appointmentData) {
      return res
        .status(404)
        .send("Invalid Appointment Id Or Not Pending Appointment");
    }
    const customer_id = appointmentData.customer_id;
    const cartItems = await Cart.find({
      customer_id,
      stylist_id,
      appointment_id,
    })
      .populate({
        path: "product_id",
        populate: [
          { path: "fabric_id" }, // Populate fabric details
          { path: "store_id" }, // Populate store details
          { path: "category_id" }, // Populate category details
        ],
      })
      .lean(); // Convert Mongoose documents to plain objects

    const enrichedCartItems = await Promise.all(
      cartItems.map(async (cartItem) => {
        const productId = cartItem.product_id._id;
        // Transform `fabric_id` and `store_id` into `fabric_data` and `store_data`
        const product = { ...cartItem.product_id };
        const fabric_data = product.fabric_id;
        const store_data = product.store_id;
        delete product.fabric_id;
        delete product.store_id;

        // Find and populate fabric_id inside Contrast
        const contrasts = await Contrast.find({ product_id: productId })
          .populate("fabric_id", "name image_url") // Populate fabric details inside Contrast
          .lean();

        const styles = await Style.find({ product_id: productId }).lean();
        const special_instruction = await SpecialInstruction.find({
          product_id: productId,
        }).lean();
        const measurement = await Measurement.find({ product_id: productId });

        // const contrastsPrice = contrasts.reduce((accumulator, currentValue) =>
        //   accumulator + currentValue.price, 0);

        // const total_amount = product.amount + contrastsPrice;

        return {
          product: { ...product, fabric_data, store_data },
          styles,
          contrasts,
          special_instruction,
          measurement,
        };
      })
    );

    res.status(200).json({
      message: "Cart retrieved successfully.",
      cart: enrichedCartItems,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/********************************* Delete Cart Data ***************************/

const deleteCartData = async (req, res) => {
  try {
    const { product_id } = req.query;

    if (!product_id) {
      return res
        .status(400)
        .json({ success: false, message: "product_id is required" });
    }

    const productObjectId = mongoose.Types.ObjectId(product_id);

    const deletionResults = {
      cart: await Cart.deleteMany({ product_id: productObjectId }),
      // styles: await Style.deleteMany({ product_id: productObjectId }),
      // measurements: await Measurement.deleteMany({ product_id: productObjectId }),
      // contrasts: await Contrast.deleteMany({ product_id: productObjectId }),
      // product: await Product.deleteMany({ _id: productObjectId }),
    };

    console.log("Deletion results:", deletionResults);
    res
      .status(200)
      .json({ success: true, message: "Data deleted successfully" });
  } catch (error) {
    console.error("Error deleting data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete data",
      error: error.message,
    });
  }
};

/********************************** Order Api ************************************/

const createOrder = async (req, res) => {
  try {
    const stylist_id = req.user._id;
    const {
      address,
      tax,
      expected_delivery,
      advance_payment,
      transaction_id,
      appointment_id,
      payment_id,
      productsDetails,
    } = req.body;

    let customer_id = null;
    let appointment_data = null;

    if (appointment_id) {
      appointment_data = await StylistAppointment.findById(appointment_id);
      if (!appointment_data) {
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      }
      customer_id = appointment_data.customer_id;
    }

    const address_id = await saveAddresses(customer_id, address);

    const cart = await Cart.find({
      customer_id,
      stylist_id,
      created_by: "stylist",
      appointment_id,
    }).populate("product_id");

    if (!cart.length) {
      return res
        .status(404)
        .json({ success: false, message: "No items found in the cart." });
    }

    const cartItems = cart.map((item) => ({
      product_id: item.product_id._id,
      name: item.product_id.name,
      price: item.product_id.price,
      quantity: item.quantity,
    }));

    const productIdss = cart.map((item) => item.product_id._id);

    const categoryData = cart.map((item) => ({
      category_name: item.product_id.category,
      store_id: item.product_id.store_id,
      quantity: item.quantity,
      type: "online",
    }));

    // 💰 Calculate totals
    let totalPrice = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const priceWithoutTax = totalPrice;

    if (tax) totalPrice += tax;
    if (advance_payment) totalPrice -= advance_payment;

    const orderData = {
      customer_id,
      stylist_id,
      products: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      type: "product",
      address_id,
      expected_delivery,
      tax: tax || 0,
      total_amount: priceWithoutTax,
      amount_due: totalPrice,
      amount_paid: advance_payment || 0,
      advance_payment,
      advance_payment_transaction_id: transaction_id,
      payment_id: payment_id || null,
      payment_status: totalPrice === 0 ? "paid" : "unpaid",
    };

    const savedOrder = await new Order(orderData).save();

    // ✅ Get product details correctly
    const productDetails = await Promise.all(
      savedOrder.products.map(async (product) =>
        Product.findById(product.product_id, {
          _id: 1,
          isLovojFabric: 1,
        }).lean()
      )
    );

    // ✅ Update appointment & order in one go
    await StylistAppointment.updateOne(
      { _id: appointment_id },
      { $set: { status: "completed" } }
    );

    const updatedOrder = await Order.findByIdAndUpdate(
      appointment_data.order_id,
      {
        $set: { status: "completed" },
        $push: { associated_order_ids: savedOrder._id },
      },
      { new: true }
    );

    const updatedOrderData = await Order.findById(appointment_data.order_id);

    // ✅ Safely handle ProductAlteration updates
    if (updatedOrderData?.ProductAlterationID) {
      const products = await ProductAlteration.findById(
        updatedOrderData.ProductAlterationID
      );
      const alterationProductIds = products?.product?.map((p) => p._id) || [];

      alterationProductIds.forEach((productId) => {
        if (
          !updatedOrderData.notAssignedProductIds?.some((p) =>
            p.productId.equals(productId)
          )
        ) {
          updatedOrderData.notAssignedProductIds.push({ productId });
        }
      });
    }

    // ✅ Add product details
    productDetails.forEach((product) => {
      if (
        product &&
        !updatedOrderData.notAssignedProductIds?.some((p) =>
          p.productId.equals(product._id)
        )
      ) {
        updatedOrderData.notAssignedProductIds.push({
          productId: product._id,
          isLovojFabric: product.isLovojFabric || false,
        });
      }
    });

    console.log(updatedOrderData.notAssignedProductIds, "before...........");
    updatedOrderData.markModified("notAssignedProductIds");
    await updatedOrderData.save();

    console.log(
      updatedOrderData.notAssignedProductIds,
      "after..................."
    );

    // ✅ Clear cart & update workers
    await Cart.deleteMany({
      customer_id,
      stylist_id,
      created_by: "stylist",
      appointment_id,
    });
    await WorkerStatus.updateMany(
      { role: "cutter", product_id: { $in: productIdss } },
      { $set: { status: "pending" } }
    );

    // const groupedProducts = productDetails.reduce((acc, item) => {
    //   const { storeId } = item;
    //   if (!acc[storeId]) acc[storeId] = [];
    //   acc[storeId].push(item);
    //   return acc;
    // }, {});

    // await Promise.all(
    //   Object.keys(groupedProducts).map(async (storeId) => {
    //     const customerId = req.body.customer_id;
    //     const storeProducts = groupedProducts[storeId];

    //     let quickOrder = await QuickOrderStatus.findOne({
    //       storeId,
    //       stylishId: stylist_id,
    //       markedStatus: "Incomplete",
    //     });

    //     const productArray = [];

    //     for (const item of storeProducts) {
    //       const { productId, isLovojFabric } = item;

    //       // const productData = await Product.findById(productId);
    //       const productData = await axios.get(
    //         `https://app.lovoj.com:446/api/v1/product/:productId`
    //       );
    //       if (!productData) continue;

    //       productArray.push({
    //         name: productData.fabricName || "Unnamed Product",
    //         gender: productData.gender,
    //         fabric_id: productData.fabric_id,
    //         fabricImage: productData.fabricImage,
    //         customerOwnFabricImage: productData.customerOwnFabricImage,
    //         fabricName: productData.fabricName,
    //         fabricMaterial: productData.fabricMaterial,
    //         fabricQuantity: productData.fabricQuantity,
    //         quantityType: productData.quantityType,
    //         fabDashNumber: productData.fabDashNumber,
    //         customNumber: productData.customNumber,
    //         tilex: productData.tilex,
    //         tiley: productData.tiley,
    //         contrast: productData.contrast,
    //         brightness: productData.brightness,
    //         rotation: productData.rotation,
    //         color: productData.color,
    //         glossy: productData.glossy,
    //         product_image_url: productData.product_image_url,
    //         isLovojFabric: !!isLovojFabric,
    //       });
    //     }

    //     // Step 3️⃣ — Create one CustomerProduct for this store
    //     const newCustomerProduct = new CustomerProduct({
    //       storeId,
    //       customerId,
    //       product: productArray,
    //     });

    //     const savedCustomerProduct = await newCustomerProduct.save();

    //     // Step 4️⃣ — If no quick order exists, create one
    //     if (!quickOrder) {
    //       quickOrder = new QuickOrderStatus({
    //         storeID: storeId,
    //         customerID: customerId,
    //         stylishId: stylistId,
    //         markedStatus: "Incomplete",
    //         notAssignedProductIds: [],
    //       });
    //     }

    //     // Step 5️⃣ — Push each productId into notAssignedProductIds
    //     for (const item of storeProducts) {
    //       quickOrder.notAssignedProductIds.push({
    //         productId: savedCustomerProduct._id,
    //         isLovojFabric: !!item.isLovojFabric,
    //       });
    //     }

    //     // Step 6️⃣ — Save the quick order
    //     await quickOrder.save();
    //   })
    // );

    // ✅ Emit socket events
    const io = getIO();
    const response = await axios.get(
      `https://app.lovoj.com:446/api/v1/orders/${appointment_data.order_id}`
    );
    const data = response.data.order;

    io.to(`order_${appointment_data.order_id}`).emit("order-update", data);
    io.to("superadmin_L100").emit("order-update", data);

    // ✅ Push notification + category update
    try {
      await sendPushNotification(
        customer_id,
        "New Order Added",
        "We have created a new order for you"
      );
      await updateMostPurchasedCategories(categoryData);
    } catch (ex) {
      console.error("Notification error:", ex);
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: savedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create order.",
      error: error.message,
    });
  }
};

// const createOrder = async (req, res) => {
//   try {
//     const stylist_id = req.user._id;
//     const {
//       address,
//       tax,
//       expected_delivery,
//       advance_payment,
//       transaction_id,
//       appointment_id,
//       payment_id,
//     } = req.body;
//     let customer_id = null;
//     let appointment_data = null;
//     let appointment_order_id = null;
//     if (appointment_id) {
//       appointment_data = await StylistAppointment.findById(appointment_id);
//       customer_id = appointment_data.customer_id;
//       appointment_order_id = appointment_data.order_id;
//     }
//     console.log({ appointment_data, customer_id, stylist_id, appointment_id });
//     const address_id = await saveAddresses(customer_id, address);
//     const cart = await Cart.find({
//       customer_id: customer_id,
//       stylist_id: stylist_id,
//       created_by: "stylist",
//       appointment_id,
//     }).populate("product_id");
//     if (!cart.length)
//       return res
//         .status(404)
//         .json({ success: false, message: "No items found in the cart." });
//     const cartItems = cart.map((item) => ({
//       product_id: item.product_id._id,
//       name: item.product_id.name,
//       price: item.product_id.price,
//       quantity: item.quantity,
//     }));
//     const productIdss = cart.map((item) => item.product_id._id);
//     const categoryData = cart.map((item) => {
//       return {
//         category_name: item.product_id.category,
//         store_id: item.product_id.store_id,
//         quantity: item.quantity,
//         type: "online",
//       };
//     });

//     let totalPrice = cartItems.reduce(
//       (acc, item) => acc + item.price * item.quantity,
//       0
//     );
//     let pricetWithoutTax = totalPrice;
//     if (tax) {
//       totalPrice += tax;
//     }
//     if (advance_payment) {
//       totalPrice -= advance_payment;
//     }
//     const orderData = {
//       customer_id: mongoose.Types.ObjectId(customer_id),
//       stylist_id: mongoose.Types.ObjectId(stylist_id),
//       products: cartItems.map((item) => ({
//         product_id: item.product_id,
//         quantity: item.quantity,
//       })),
//       type: "product",
//       address_id,
//       expected_delivery,
//       tax: tax,
//       payment_status: "unpaid",
//       payment_id: payment_id ? payment_id : null,
//       total_amount: pricetWithoutTax,
//       amount_due: totalPrice,
//       address_id,
//       amount_paid: advance_payment,
//       advance_payment,
//       advance_payment_transaction_id: transaction_id,
//       payment_status: totalPrice == 0 ? "paid" : "unpaid",
//     };
//     const savedOrder = await new Order(orderData).save();
//     const productIds = savedOrder.products.map(async (product) => {
//       const productData = await Product.findById(product.product_id, {
//         _id: 1,
//         isLovojFabric: 1,
//       }).lean();
//       return productData;
//     });
//     await StylistAppointment.updateOne(
//       { _id: appointment_id },
//       { $set: { status: "completed" } }
//     );
//     const updatedOrderData = await Order.updateOne(
//       { _id: appointment_data.order_id },
//       {
//         $set: { status: "completed" },
//         $push: { associated_order_ids: savedOrder._id },
//       }
//     );
//     if (updatedOrderData.ProductAlterationID) {
//       const products = await ProductAlteration.findById(
//         updatedOrderData.ProductAlterationID
//       );
//       const productIds = products
//         ? products?.product?.map((product) => product._id)
//         : [];

//       productIds.forEach((productId) => {
//         if (
//           !updatedOrderData?.notAssignedProductIds?.some((p) =>
//             p.productId.equals(productId)
//           )
//         ) {
//           updatedOrderData?.notAssignedProductIds?.push({ productId });
//         }
//       });
//     }
//     if (productIds && productIds.length > 0) {
//       productIds.forEach((product) => {
//         const alreadyExists = updatedOrderData?.notAssignedProductIds?.some(
//           (p) => p.productId.equals(product._id)
//         );

//         if (!alreadyExists) {
//           updatedOrderData?.notAssignedProductIds?.push({
//             productId: product._id,
//             // isHelper: product.isHelper || false,
//             // isEmbroidery: product.isEmbroidery || false,
//             isLovojFabric: product.isLovojFabric || false,
//           });
//         }
//       });
//     }
//     await Cart.deleteMany({
//       customer_id: mongoose.Types.ObjectId(customer_id),
//       stylist_id: mongoose.Types.ObjectId(stylist_id),
//       created_by: "stylist",
//       appointment_id,
//     });
//     await WorkerStatus.updateMany(
//       { role: "cutter", product_id: { $in: productIdss } },
//       { $set: { status: "pending" } }
//     );
//     await updatedOrderData.save();
//     const io = getIO();
//     const response = await axios.get(
//       `https://app.lovoj.com:446/api/v1/orders/${appointment_data.order_id}`
//     );

//     // console.log(response, "response.........");

//     //  const orderListing = await axios.get(
//     //    `https://app.lovoj.com:446/api/v1/orders/orderListing`,
//     //    // `http://localhost:4000/api/v1/orders/orderListing`,
//     //    {
//     //      headers: {
//     //        user: JSON.stringify(appointment.customer_id.toString()),
//     //      },
//     //    }
//     //  );

//     const data = response.data.order;
//     //  const orders = orderListing.data.orders;

//     io.to(`order_${appointment_data.order_id}`).emit("order-update", data);

//     io.to("superadmin_L100").emit("order-update", data);
//     //  io.to(`${appointment.customer_id}`).emit("orders-update", orders);

//     try {
//       await sendPushNotification(
//         customer_id,
//         "New Order Added",
//         "We have created new order for you"
//       );
//       await updateMostPurchasedCategories(categoryData);
//     } catch (ex) {}

//     res.status(201).json({
//       success: true,
//       message: "Order created successfully.",
//       data: savedOrder,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create order.",
//       error: error.message,
//     });
//   }
// };

const newCreateOrder = async (req, res) => {
  try {
    const stylist_id = req.user._id;
    const {
      address,
      tax,
      expected_delivery,
      advance_payment,
      transaction_id,
      appointment_id,
      payment_id,
      productDetails,
    } = req.body;

    // {[productId, fabricRole, storeId, price]}

    let customer_id = null;
    let appointment_data = null;

    if (appointment_id) {
      appointment_data = await StylistAppointment.findById(appointment_id);
      if (!appointment_data) {
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      }
      customer_id = appointment_data.customer_id;
    }

    const address_id = await saveAddresses(customer_id, address);

    const cart = await Cart.find({
      customer_id,
      stylist_id,
      created_by: "stylist",
      appointment_id,
    }).populate("product_id");

    if (!cart.length) {
      return res
        .status(404)
        .json({ success: false, message: "No items found in the cart." });
    }

    const cartItems = cart.map((item) => ({
      product_id: item.product_id._id,
      name: item.product_id.name,
      price: item.product_id.price,
      quantity: item.quantity,
    }));

    const productIdss = cart.map((item) => item.product_id._id);

    const categoryData = cart.map((item) => ({
      category_name: item.product_id.category,
      store_id: item.product_id.store_id,
      quantity: item.quantity,
      type: "online",
    }));

    // 💰 Calculate totals
    let totalPrice = cartItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const priceWithoutTax = totalPrice;

    if (tax) totalPrice += tax;
    if (advance_payment) totalPrice -= advance_payment;

    const orderData = {
      customer_id,
      stylist_id,
      products: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      type: "product",
      address_id,
      expected_delivery,
      tax: tax || 0,
      total_amount: priceWithoutTax,
      amount_due: totalPrice,
      amount_paid: advance_payment || 0,
      advance_payment,
      advance_payment_transaction_id: transaction_id,
      payment_id: payment_id || null,
      payment_status: totalPrice === 0 ? "paid" : "unpaid",
    };

    // const savedOrder = await new Order(orderData).save();

    // ✅ Get product details correctly
    // const productDetails = await Promise.all(
    //   savedOrder.products.map(async (product) =>
    //     Product.findById(product.product_id, {
    //       _id: 1,
    //       isLovojFabric: 1,
    //     }).lean()
    //   )
    // );

    // ✅ Update appointment & order in one go
    // await StylistAppointment.updateOne(
    //   { _id: appointment_id },
    //   { $set: { status: "completed" } }
    // );

    // const updatedOrder = await Order.findByIdAndUpdate(
    //   appointment_data.order_id,
    //   {
    //     $set: { status: "completed" },
    //     $push: { associated_order_ids: savedOrder._id },
    //   },
    //   { new: true }
    // );

    // const updatedOrderData = await Order.findById(appointment_data.order_id);

    // // ✅ Safely handle ProductAlteration updates
    // if (updatedOrderData?.ProductAlterationID) {
    //   const products = await ProductAlteration.findById(
    //     updatedOrderData.ProductAlterationID
    //   );
    //   const alterationProductIds = products?.product?.map((p) => p._id) || [];

    //   alterationProductIds.forEach((productId) => {
    //     if (
    //       !updatedOrderData.notAssignedProductIds?.some((p) =>
    //         p.productId.equals(productId)
    //       )
    //     ) {
    //       updatedOrderData.notAssignedProductIds.push({ productId });
    //     }
    //   });
    // }

    // // ✅ Add product details
    // productDetails.forEach((product) => {
    //   if (
    //     product &&
    //     !updatedOrderData.notAssignedProductIds?.some((p) =>
    //       p.productId.equals(product._id)
    //     )
    //   ) {
    //     updatedOrderData.notAssignedProductIds.push({
    //       productId: product._id,
    //       isLovojFabric: product.isLovojFabric || false,
    //     });
    //   }
    // });

    // console.log(updatedOrderData.notAssignedProductIds, "before...........");
    // updatedOrderData.markModified("notAssignedProductIds");
    // await updatedOrderData.save();

    // console.log(
    //   updatedOrderData.notAssignedProductIds,
    //   "after..................."
    // );

    // ✅ Clear cart & update workers
    // await Cart.deleteMany({
    //   customer_id,
    //   stylist_id,
    //   created_by: "stylist",
    //   appointment_id,
    // });
    // await WorkerStatus.updateMany(
    //   { role: "cutter", product_id: { $in: productIdss } },
    //   { $set: { status: "pending" } }
    // );

    const groupedProducts = productDetails.reduce((acc, item) => {
      const { storeId } = item;
      if (!acc[storeId]) acc[storeId] = [];
      acc[storeId].push(item);
      return acc;
    }, {});

    await Promise.all(
      Object.keys(groupedProducts).map(async (storeId) => {
        const customerId = customer_id;
        const storeProducts = groupedProducts[storeId];

        let quickOrder = await QuickOrderStatus.findOne({
          storeId,
          stylishId: stylist_id,
          markedStatus: "Incomplete",
        });

        const productArray = [];
        const measurementArray = [];

        for (const item of storeProducts) {
          const { productId, isLovojFabric } = item;

          // const productData = await Product.findById(productId);

          const product = await axios.get(
            // `https://app.lovoj.com:446/api/v1/product/${productId}`
            `https://app.lovoj.com:446/api/v1/product/68d25f93396aebe4a80ef219`
          );
          console.log(product.data.measurements, "rpoduct...............");
          const productData = product.data.product;
          if (!productData) continue;

          productArray.push({
            name: productData.category_data.productName || "Unnamed Product",
            productNumber: productData.category_data.productNumber,
            productQuantity: productData.productQuantity || 1,
            gender: productData.gender,
            categories: productData.category_data.categories,
            fabric_id: productData.fabric_id,
            fabricImage: productData.fabricImage,
            customerOwnFabricImage: productData.customerOwnFabricImage,
            fabricName: productData.fabricName,
            fabricMaterial: productData.fabricMaterial,
            fabricQuantity: productData.fabric_quantity,
            quantityType: productData.unit,
            fabDashNumber: productData.fabDashNumber,
            customNumber: productData.customNumber,
            tilex: productData.tilex,
            tiley: productData.tiley,
            contrast: productData.contrast,
            brightness: productData.brightness,
            rotation: productData.rotation,
            color: productData.color,
            glossy: productData.glossy,
            product_image_url: productData.product_image_url,
            isLovojFabric: !!isLovojFabric,
          });
        }

        // measurementArray.push({
        //   productId: productData._id,
        //   MeasurmentType:,
        // });

        // Step 3️⃣ — Create one CustomerProduct for this store
        const newCustomerProduct = new CustomerProduct({
          storeId,
          customerId,
          product: productArray,
        });

        const savedCustomerProduct = await newCustomerProduct.save();

        console.log(savedCustomerProduct, "savedCustomerProduct");

        // Step 4️⃣ — If no quick order exists, create one
        if (!quickOrder) {
          quickOrder = new QuickOrderStatus({
            storeID: storeId,
            customerID: customerId,
            productID: savedCustomerProduct._id,
            stylishId: stylist_id,
            markedStatus: "Incomplete",
            notAssignedProductIds: [],
            orderType: "b2c",
          });
        }

        // Step 5️⃣ — Push each productId into notAssignedProductIds
        for (const item of storeProducts) {
          quickOrder.notAssignedProductIds.push({
            productId: savedCustomerProduct._id,
            isLovojFabric: !!item.isLovojFabric,
          });
        }

        // Step 6️⃣ — Save the quick order
        await quickOrder.save();
        console.log(quickOrder, "quickOrder..........");
      })
    );

    // ✅ Emit socket events
    const io = getIO();
    const response = await axios.get(
      `https://app.lovoj.com:446/api/v1/orders/${appointment_data.order_id}`
    );
    const data = response.data.order;

    io.to(`order_${appointment_data.order_id}`).emit("order-update", data);
    io.to("superadmin_L100").emit("order-update", data);

    // ✅ Push notification + category update
    try {
      await sendPushNotification(
        customer_id,
        "New Order Added",
        "We have created a new order for you"
      );
      await updateMostPurchasedCategories(categoryData);
    } catch (ex) {
      console.error("Notification error:", ex);
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully.",
      data: savedOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to create order.",
      error: error.message,
    });
  }
};

const getStylistAppointmentList = async (req, res) => {
  try {
    const status = "pending";
    const stylist_id = req.user._id;
    // Get current date in India with time set to 00:00:00
    const indiaTimeZone = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date(indiaTimeZone);
    currentDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(indiaTimeZone);
    nextDate.setHours(0, 0, 0, 0);
    nextDate.setDate(nextDate.getDate() + 1);

    // Build the query object dynamically based on provided filters
    const query = {
      start_time: { $gte: currentDate, $lte: nextDate },
      stylist_id,
      status: { $in: ["pending", "started", "reached", "cancelled"] },
    }; // Default to current date

    // Fetch and populate related fields
    let appointments = await StylistAppointment.find(query)
      .lean()
      .populate("stylist_id", "name email") // Adjust fields to match User schema
      .populate("address_id")
      .populate("customer_id")
      .exec(); // Adjust fields to match Address schema;
    const query1 = { start_time: { $gte: nextDate }, stylist_id };
    if (status) {
      query1.status = status;
    }
    appointments = appointments.map((m) => {
      return {
        ...m,
        stylist_data: m.stylist_id,
        type: m.type ? m.type : "measurement",
        stylist_id: undefined,
        customer_data: m.customer_id,
        address_data: m.address_id,
        address_id: undefined,
        customer_id: undefined,
      };
    });
    let futureAppointments = await StylistAppointment.find(query1)
      .sort({ createdAt: -1 })
      .lean()
      .populate("stylist_id", "name email") // Adjust fields to match User schema
      .populate("address_id")
      .populate("customer_id") // Adjust fields to match Address schema
      // Adjust fields to match Address schema
      .exec();
    futureAppointments = futureAppointments.map((m) => {
      return {
        ...m,
        stylist_data: m.stylist_id,
        type: m.type ? m.type : "measurement",
        stylist_id: undefined,
        customer_data: m.customer_id,
        address_data: m.address_id,
        address_id: undefined,
        customer_id: undefined,
      };
    });

    const query2 = { status: "completed", stylist_id };
    let pastAppointments = await StylistAppointment.find(query2)
      .sort({ createdAt: -1 })
      .lean()
      .populate("stylist_id", "name email") // Adjust fields to match User schema
      .populate("address_id")
      .populate("customer_id") // Adjust fields to match Address schema
      // Adjust fields to match Address schema
      .exec();
    pastAppointments = pastAppointments.map((m) => {
      return {
        ...m,
        stylist_data: m.stylist_id,
        type: m.type ? m.type : "measurement",
        stylist_id: undefined,
        customer_data: m.customer_id,
        address_data: m.address_id,
        address_id: undefined,
        customer_id: undefined,
      };
    });

    res.status(200).json({
      success: true,
      current_appointments: appointments,
      future_appointments: futureAppointments,
      completed_appointments: pastAppointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch appointments" });
  }
};

const putStylistAppointment = async (req, res) => {
  try {
    const { appointment_id, status } = req.body;

    if (!appointment_id || !status) {
      return res.status(400).json({
        success: false,
        message: "stylist_id and status are required",
      });
    }

    const updatedAppointment = await StylistAppointment.findOneAndUpdate(
      { _id: appointment_id },
      { status },
      { new: true }
    )
      .populate("stylist_id", "name email")
      .populate("address", "street city state zip");

    if (!updatedAppointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    res.status(200).json({ success: true, data: updatedAppointment });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update appointment status" });
  }
};

/************************************************************************/

const updatePendingAppointments = async (req, res) => {
  try {
    const { appointment_id } = req.query;
    // const stylist_id = "65e1c5e5864ecba0892d2f2f";
    const stylist_id = req.user._id;
    let gender = req.user.gender == "male" ? "men" : "women";

    if (!stylist_id)
      return res.status(400).json({ message: "Stylist ID is required." });
    if (!appointment_id)
      return res.status(400).json({ message: "Appointment ID is required." });

    // Find the specific appointment
    const appointment = await StylistAppointment.findOne({
      _id: appointment_id,
      // stylist_id,
      status: "pending",
    });
    if (!appointment)
      return res
        .status(404)
        .json({ message: "Appointment not found or not pending." });

    const { order_id } = appointment;
    if (!order_id)
      return res
        .status(400)
        .json({ message: "No order_id associated with this appointment." });

    const order = await Order.findById(order_id)
      .populate("products.product_id")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found." });
    // Add products to the Cart collection
    const products = order.products.filter(
      (m) => m.product_id.gender == gender
    );
    const cartPromises = products.map(({ product_id, quantity }) => {
      return new Cart({
        product_id,
        quantity,
        stylist_id,
        customer_id: order.customer_id,
        appointment_id,
        created_by: "stylist",
        appointment_id: appointment_id,
      }).save();
    });

    await Promise.all(cartPromises);
    const updatedStylistAppointmentData = await StylistAppointment.updateOne(
      { _id: appointment_id },
      { status: "started" }
    );
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const existingOtp = await Otp.findOne({ order_id });
    if (!existingOtp) {
      await new Otp({ otp_key: otp, order_id }).save();
    }

    const io = getIO();
    // const updateData = {
    //   orderId: order_id.toString(),
    //   status: "started",
    //   otp,
    // };
    const response = await axios.get(
      `https://app.lovoj.com:446/api/v1/orders/${order_id}`
    );

    // console.log(response, "response.........");

    const orderListing = await axios.get(
      `https://app.lovoj.com:446/api/v1/orders/orderListing`,
      // `http://localhost:4000/api/v1/orders/orderListing`,
      {
        headers: {
          user: JSON.stringify(appointment.customer_id.toString()),
        },
      }
    );

    const data = response.data.order;
    const orders = orderListing.data.orders;

    io.to(`order_${order_id}`).emit("order-update", data);

    io.to("superadmin_L100").emit("order-update", data);
    io.to(`${appointment.customer_id}`).emit("orders-update", orders);

    res.status(200).json({
      message:
        "Appointment processed successfully, products saved to Cart, and status updated to 'accepted'.",
    });
  } catch (error) {
    console.log(error, "error");
    res
      .status(500)
      .json({ message: "Error processing appointment.", error: error.message });
  }
};

/************************************* Stylish Done Order *****************/

const updateProductsPricing = async (req, res) => {
  try {
    const { products, expected_delivery, order_id } = req.body;

    // ✅ Update order's expected delivery if provided
    if (order_id && expected_delivery) {
      await Order.updateOne({ _id: order_id }, { expected_delivery });
    }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Products must be a non-empty array.",
      });
    }

    const productIds = products.map((p) => p._id);
    const productMap = new Map(products.map((p) => [p._id, p]));

    // ✅ Fetch all products in a single query
    const existingProducts = await Product.find({ _id: { $in: productIds } });

    if (existingProducts.length !== products.length) {
      const missingIds = productIds.filter(
        (id) => !existingProducts.some((p) => p._id.toString() === id)
      );
      return res.status(404).json({
        success: false,
        message: `Products not found: ${missingIds.join(", ")}`,
      });
    }

    // ✅ Optimize updates using `bulkWrite`
    const productUpdates = [];
    const workerStatusEntries = [];

    existingProducts.forEach((product) => {
      const updateData = productMap.get(product._id.toString());

      const updateFields = {};
      if (updateData.price) updateFields.price = updateData.price;
      if (updateData.store_id) updateFields.store_id = updateData.store_id;

      if (Object.keys(updateFields).length) {
        productUpdates.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $set: updateFields },
          },
        });
      }

      // ✅ Create WorkerStatus entry
      if (updateData.fabric_store_id)
        workerStatusEntries.push({
          store_id: updateData.fabric_store_id || null, // Use store_id if available
          product_id: product._id,
          combination: updateData.combination || [],
          worker_id: null, // Modify if worker_id is needed
          status: "initiated",
          timer_start: null,
          timer_end: null,
          role: "cutter",
        });
    });

    // ✅ Execute bulk operations
    const bulkOps = [];
    if (productUpdates.length) bulkOps.push(Product.bulkWrite(productUpdates));
    if (workerStatusEntries.length)
      bulkOps.push(WorkerStatus.insertMany(workerStatusEntries));

    await Promise.all(bulkOps);

    // const io = getIO();
    // const data = await axios.get(
    //   `https://app.lovoj.com:446/api/v1/orders/${order_id}`
    // );

    // io.to(`order_${order_id}`).emit("order-update", data);

    // io.to("superadmin_L100").emit("order-update", data);

    return res.status(200).json({
      success: true,
      message: "Products updated and worker status initiated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating products and creating worker status.",
      error: error.message,
    });
  }
};

/********************************* Update Statusssssss *******************/

// const updateStatus = async (req, res) => {
//   try {
//     const { id } = req.params; // StylistAppointment ID
//     const { status, otp, order_id } = req.body;

//     // Validate the status value
//     if (
//       !status ||
//       !['unassigned', 'pending', 'accepted', 'started', 'reached', 'cancelled', 'completed'].includes(status)
//     ) {
//       return res.status(400).json({ success: false, message: "Invalid status value." });
//     }

//     // Handle OTP verification if status is 'reached'
//     if (status === "reached") {
//       if (!otp || !order_id) {
//         return res.status(400).json({ success: false, message: "OTP and order_id are required for 'reached' status." });
//       }

//       // Validate `order_id` format
//       if (!mongoose.Types.ObjectId.isValid(order_id)) {
//         return res.status(400).json({ success: false, message: "Invalid order ID format." });
//       }

//       // Find the OTP entry in the database for the given order_id
//       const otpEntry = await Otp.findOne({ order_id, used: false });

//       if (!otpEntry) {
//         return res.status(400).json({ success: false, message: "Invalid or expired OTP for the given order ID." });
//       }

//       // Compare the provided OTP with the stored plain OTP
//       const isOtpValid = otp === otpEntry.otp_key;

//       if (!isOtpValid) {
//         return res.status(400).json({ success: false, message: "Invalid OTP." });
//       }

//       // Mark the OTP as used
//       otpEntry.used = true;
//       await otpEntry.save();
//     }

//     // Update the status in the StylistAppointment collection
//     const updatedAppointment = await StylistAppointment.findByIdAndUpdate(
//       id,
//       { status },
//       { new: true }
//     );

//     if (!updatedAppointment) {
//       return res.status(404).json({ success: false, message: "Appointment not found." });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Status updated successfully.",
//       data: updatedAppointment,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Error updating status.",
//       error: error.message,
//     });
//   }
// };

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params; // StylistAppointment ID
    const { status, otp } = req.body;
    const appointment = await StylistAppointment.findById(id);
    if (!appointment) {
      return res.status(404).send("AppointmentId is invalid");
    }
    const order_id = appointment.order_id;
    // Validate status
    const validStatuses = [
      "unassigned",
      "pending",
      "started",
      "reached",
      "cancelled",
      "completed",
    ];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value." });
    }

    // Handle OTP verification for 'reached' status
    if (status === "reached") {
      if (!otp || !mongoose.Types.ObjectId.isValid(order_id)) {
        return res.status(400).json({
          success: false,
          message: "Valid OTP and order_id are required for 'reached' status.",
        });
      }

      const otpEntry = await Otp.findOne({ order_id });
      if (!otpEntry || otp !== otpEntry.otp_key) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid or expired OTP." });
      }

      otpEntry.used = true;
      await otpEntry.save();
    }

    // Update status
    const updatedAppointment = await StylistAppointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updatedAppointment) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found." });
    }

    // const io = getIO();
    // const data = await axios.get(
    //   `https://app.lovoj.com:446/api/v1/orders/${order_id}`
    // );

    // io.to(`order_${order_id}`).emit("order-update", data);

    // io.to("superadmin_L100").emit("order-update", data);

    res.status(200).json({
      success: true,
      message: "Status updated successfully.",
      data: updatedAppointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating status.",
      error: error.message,
    });
  }
};

/******************************** Otp Sent For Stylist ********************/

// const sendOtp = async (req, res) => {
//   try {
//     const { email, mobileNumber, order_id } = req.body;

//     // Validate `order_id` format
//     if (!mongoose.Types.ObjectId.isValid(order_id)) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid order ID format." });
//     }

//     // Check if at least one of email or mobileNumber is provided
//     if (!email && !mobileNumber) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Either email or mobile number must be provided." });
//     }

//     const now = new Date();
//     const otp = Math.floor(100000 + Math.random() * 900000);

//     // Save the OTP data to the database with `order_id`
//     const otpData = new Otp({
//       mobileNumber,
//       email,
//       otp_key: otp.toString(),
//       order_id, // Pass ObjectId for order_id
//       created: now,
//     });

//     await otpData.save();

//     // Updated message
//     const message = `Your OTP for resetting your password is: ${otp}. For more assistance, visit https://www.lovoj.com/.`;

//     // Send SMS if mobileNumber is provided
//     if (mobileNumber) {
//       await sendSMS(
//         message,
//         `91${mobileNumber}`,
//         "Lovoj",
//         process.env.AWS_ENTITY_ID,
//         process.env.FORGOT_PASS_SMS_AWS_TEMPLATE_ID
//       );
//     }

//     // Send email if email is provided
//     if (email) {
//       const emailData = {
//         email,
//         template_id: process.env.FORGOT_PASSWORD_OTP_TEMPLATE_ID,
//         custom_data: {
//           otpValue: otp,
//         },
//       };
//       sendEmailViaOneSignal(emailData);
//     }

//     return res.status(200).json({
//       success: true,
//       message: "OTP sent successfully and saved in the database.",
//     });
//   } catch (error) {
//     console.error("Error in sending OTP:", error);
//     return res.status(500).json({
//       success: false,
//       message: "An error occurred while sending OTP. Please try again.",
//     });
//   }
// };

const sendOtp = async (req, res) => {
  try {
    const { email, mobileNumber, order_id } = req.body;

    // Validate input
    if (!mongoose.Types.ObjectId.isValid(order_id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID format." });
    }
    if (!email && !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Provide either email or mobile number.",
      });
    }

    // Generate and save OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await new Otp({
      mobileNumber,
      email,
      otp_key: otp,
      order_id,
      created: new Date(),
    }).save();

    // Prepare notification details
    const message = `Your OTP for resetting your password is: ${otp}. For more assistance, visit https://www.lovoj.com/.`;
    const emailData = {
      email,
      template_id: process.env.FORGOT_PASSWORD_OTP_TEMPLATE_ID,
      custom_data: { otpValue: otp },
    };

    // Send SMS or email notifications
    if (mobileNumber)
      await sendSMS(
        message,
        `91${mobileNumber}`,
        "Lovoj",
        process.env.AWS_ENTITY_ID,
        process.env.FORGOT_PASS_SMS_AWS_TEMPLATE_ID
      );
    if (email) sendEmailViaOneSignal(emailData);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully and saved in the database.",
    });
  } catch (error) {
    console.error("Error in sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Error sending OTP. Please try again.",
    });
  }
};
const stylistAppointmentStatuses = async (req, res) => {
  try {
    // Assuming the middleware "authenticate" sets the req.user._id
    const stylistId = req.user._id;
    const status = req.params.status;

    // Fetch appointments with status = "reached" for the given stylist_id
    let appointments = await StylistAppointment.find({
      stylist_id: stylistId,
      status: status,
    })
      .lean()
      .populate("stylist_id", "name email")
      .populate("address_id")
      .populate("customer_id")
      .exec();

    appointments = appointments.map((m) => {
      return {
        ...m,
        stylist_data: m.stylist_id,
        stylist_id: undefined,
        customer_data: m.customer_id,
        address_data: m.address_id,
        address_id: undefined,
        customer_id: undefined,
      };
    });

    // Return the fetched appointments
    res.status(200).json({
      success: true,
      data: appointments,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/******************************* Stylist my order data **********************/

const stylistmyorder = async (req, res) => {
  try {
    const stylist_id = req.user._id;
    const { order_status } = req.query; // Get order_status from query

    if (!stylist_id) {
      return res.status(400).json({ message: "Stylist ID is required." });
    }

    // Build the query object dynamically
    const query = { stylist_id };
    if (order_status) {
      query.order_status = order_status;
    }

    // Fetch orders and populate customerData and addressData
    const stylistorders = await Order.find(query)
      .populate({
        path: "customer_id",
        select: "name email mobileNumber address", // Select the fields to include from the customer
      })
      .populate({
        path: "address_id",
        select:
          "full_name mobile_number address_1 address_2 address_3 landmark pincode city_name state country default_address", // Select fields from customer_addresses
      })
      .lean();

    if (!stylistorders.length) {
      return res.status(404).json({
        message: "No orders found for the stylist with the specified criteria.",
      });
    }

    const productIds = stylistorders.flatMap((order) =>
      order.products.map((product) => product.product_id)
    );

    // Fetch related data in parallel
    const [products, styles, contrasts, measurements] = await Promise.all([
      Product.find({ _id: { $in: productIds } })
        .select("fabric_id amount category gender type category_id")
        .populate("fabric_id")
        .lean(),
      Style.find({ product_id: { $in: productIds } })
        .select("type name image product_id")
        .lean(),
      Contrast.find({ product_id: { $in: productIds } })
        .select(
          "name type price currency product_id image_url fabric_image_url"
        )
        .populate("fabric_id")
        .lean(),
      Measurement.find({ product_id: { $in: productIds } })
        .select("type value unit image_url alt1 alt2 context product_id")
        .lean(),
    ]);

    // Prepare response data
    res.status(200).json({
      message: "My order data retrieved successfully!",
      stylistorders: stylistorders.map(
        ({ customer_id, address_id, ...order }) => ({
          ...order,
          customer_data: customer_id,
          address_data: address_id,
        })
      ),
      orderData: {
        products: products.map(({ fabric_id, ...rest }) => ({
          ...rest,
          fabric_data: fabric_id,
        })),
        styles,
        contrasts: contrasts.map(({ fabric_id, ...rest }) => ({
          ...rest,
          fabric_data: fabric_id,
        })),
        measurements,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching my order data", error: error.message });
  }
};

/******************************* admin my order data **********************/

// // API to fetch products by store_id
// const adminmyorder = async (req, res) => {
//   try {
//     // Extract store_id from req.user
//     const store_id = req.user.storeId;
//     // const store_id = "65757603ff441f05d8196168";
//     console.log("store_id",store_id)

//     if (!store_id) {
//       return res.status(400).json({ message: "Store ID not found in user." });
//     }

//     // Find products with the provided store_id
//     const products = await Product.find({ store_id: store_id });

//     if (products.length === 0) {
//       return res.status(404).json({ message: "No products found for this store." });
//     }

//     // Send back the products found
//     res.status(200).json({ products });
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

/**************** */

const adminmyorder = async (req, res) => {
  try {
    // Extract store_id from req.user
    // const storeId = req.user.storeId;
    const store_id = "65757603ff441f05d8196168";

    if (!store_id) {
      return res.status(400).json({ message: "Store ID not found in user." });
    }

    const productId = req.query.product_id;

    // Fetch products for the given store_id
    const products = await Product.find({ store_id: store_id });

    if (products.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for this store." });
    }

    // Filter products by product_id if provided
    let filteredProducts = products;
    if (productId) {
      filteredProducts = products.filter(
        (product) => product._id.toString() === productId
      );
    }

    // Gather all productIds from filteredProducts
    const productIds = filteredProducts.map((product) => product._id);

    // Fetch data from Style, Contrast, Measurement, and WorkerStatus collections
    const [styles, contrasts, measurements, workerStatuses] = await Promise.all(
      [
        Style.find({ product_id: { $in: productIds } })
          .select("type name image product_id")
          .lean(),
        Contrast.find({ product_id: { $in: productIds } })
          .select(
            "name type price currency product_id image_url fabric_image_url"
          )
          .populate("fabric_id")
          .lean(),
        Measurement.find({ product_id: { $in: productIds } })
          .select("type value unit image_url alt1 alt2 context product_id")
          .lean(),
        WorkerStatus.find({
          product_id: { $in: productIds },
          store_id: store_id,
        }),
      ]
    );

    // Attach the additional data to the response
    const response = filteredProducts.map((product) => {
      const productId = product._id.toString();
      return {
        ...product.toObject(),
        styles: styles.filter(
          (style) => style.product_id.toString() === productId
        ),
        contrasts: contrasts.filter(
          (contrast) => contrast.product_id.toString() === productId
        ),
        measurements: measurements.filter(
          (measurement) => measurement.product_id.toString() === productId
        ),
        workers: workerStatuses.filter(
          (worker) => worker.product_id.toString() === productId
        ),
      };
    });

    // Send the final response
    res.status(200).json({ products: response });
  } catch (error) {
    console.error("Error fetching products and associated data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/********************************** Customer Profile Data **********************/

const getCustomerDataByAppointmentId = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the stylist appointment by ID and populate the customer data
    const appointment = await StylistAppointment.findById(id).populate({
      path: "customer_id",
      model: "OnlineCustomers",
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Stylist appointment not found",
      });
    }

    const customerData = appointment.customer_id;

    return res.status(200).json({
      success: true,
      message: "Customer data fetched successfully",
      appointmentId: id,
      customer: customerData,
    });
  } catch (error) {
    console.error("Error fetching customer data:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
const deleteProductContrast = async (req, res) => {
  try {
    const contrast_id = req.body.product_contrast_id;

    if (!contrast_id) {
      return res
        .status(400)
        .json({ success: false, message: "Product contrast ID is required" });
    }

    const result = await Contrast.deleteOne({ _id: contrast_id });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Product contrast not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Error deleting product contrast:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getMostPurchasedCategories = async (req, res) => {
  try {
    const store_id = req.user.storeId;
    const type = req.query.type;
    const query = { store_id };
    if (type) {
      query.type = type;
    }

    if (!store_id) {
      return res
        .status(400)
        .json({ success: false, message: "Store ID missing in user object." });
    }

    const categories = await PurchasedCategory.find(query)
      .sort({ count: -1 }) // Descending order
      .select("category_name category_id store_id count");

    res.status(200).json({
      success: true,
      message: "Most purchased categories fetched successfully.",
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch most purchased categories.",
      error: error.message,
    });
  }
};

const createAlterationProduct = async (req, res, next) => {
  const { _id } = req.user;
  const { customerId, product, orderId, productNumber } = req.body;
  try {
    // Find customer
    console.log(
      customerId,
      "customerid............",
      typeof mongoose.Types.ObjectId("68a36104a4f1aa3b84538643"),
      "type of this............."
    );
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid customerId" });
    }
    const findCustomer = await OnlineCustomers.findOne({
      _id: mongoose.Types.ObjectId(customerId),
    });
    console.log(findCustomer, "findCustomer.................");
    if (!findCustomer)
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });

    // Validate the product array
    if (!product || !Array.isArray(product) || product.length === 0)
      return next(
        new AppError("Invalid AltreationProduct array in the request body", 400)
      );

    // Find the existing QuickOrderStatus for the customer with status: false
    let orderStatus = await Order.findOne({
      _id: mongoose.Types.ObjectId(orderId),
      stylishs: { $in: [mongoose.Types.ObjectId(_id)] },
      customer_id: mongoose.Types.ObjectId(customerId),
      order_status: "processing",
    });

    console.log(orderStatus, "orderStatus");

    if (orderStatus) {
      // Update existing customerProductAlteration if ProductAlterationID is found
      if (orderStatus.ProductAlterationID) {
        const existingCustomerProduct = await ProductAlteration.findOne({
          stylish_id: _id,
          customer_id: customerId,
          _id: orderStatus.ProductAlterationID,
        });

        if (existingCustomerProduct) {
          existingCustomerProduct.product.push(
            ...product.map((item) => ({
              ...item,
              categories: item.categories.map((category) => ({
                name: category.name || "Default Category Name",
                alteration: category.alteration || [],
              })),
            }))
          );
          const updatedCustomerProduct = await existingCustomerProduct.save();

          return res.status(200).json({
            success: true,
            message: "AltreationProduct updated successfully",
            updatedCustomerProduct,
          });
        }
      }
    }

    // If no ProductAlterationID, create a new customerProductAlteration
    const newCustomerProduct = new ProductAlteration({
      stylish_id: _id,
      customerId,
      // orderNumber,
      orderId,
      product: product.map((item) => ({
        ...item,
        categories: item.categories.map((category) => ({
          name: category.name || "Default Category Name",
          alteration: category.alteration || [],
        })),
      })),
    });

    const savedCustomerProduct = await newCustomerProduct.save();

    // If orderStatus exists, update its ProductAlterationID, otherwise create a new QuickOrderStatus
    if (orderStatus) {
      orderStatus.ProductAlterationID = savedCustomerProduct._id;
      await orderStatus.save();
    } else {
      orderStatus = await Order.create({
        stylist_id: _id,
        customer_id: customerId,
        ProductAlterationID: savedCustomerProduct._id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "AltreationProduct saved successfully",
      orderStatus,
      savedCustomerProduct,
    });
  } catch (error) {
    console.error("Error creating customer AltreationProduct:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const createAlterationMesurment = async (req, res, next) => {
  const { _id } = req.user;

  try {
    const { customerId, products, orderId } = req.body;

    const findCustomer = await OnlineCustomers.findOne({
      _id: mongoose.Types.ObjectId(customerId),
    });
    if (!findCustomer)
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    // Check if customerMesurment already exists for the given customerId and orderNumber
    let orderStatus = await Order.findOne({
      _id: mongoose.Types.ObjectId(orderId),
      stylishs: { $in: [mongoose.Types.ObjectId(_id)] },
      customer_id: mongoose.Types.ObjectId(customerId),
      order_status: "processing",
    });
    console.log({ orderStatus });
    if (!orderStatus || !orderStatus.ProductAlterationID)
      return res.status(400).json({
        success: false,
        message: "Please add product first!",
      });

    if (orderStatus.measurementAlterationID) {
      console.log(orderStatus.measurementAlterationID, "inside update");
      const existingCustomerMesurment = await MeasureAlteration.findOne({
        stylish_id: _id,
        _id: orderStatus.measurementAlterationID,
      });
      if (!existingCustomerMesurment)
        return res.status(400).json({
          success: false,
          message: "Measurement alteration not found!",
        });

      // Update the existing document with the new product data
      let updated = false;
      let newCategoriesAdded = false;
      let productsMeasurementUpdated = [];
      let productsMeasurementInserted = [];

      // Loop through each category in the request
      for (const product of products) {
        const existingCategoryIndex =
          existingCustomerMesurment.products.findIndex(
            (cat) => cat.productId.toString() === product.productId.toString()
          );

        if (existingCategoryIndex === -1) {
          // If category doesn't exist, push the entire category object
          existingCustomerMesurment.products.push(product);
          newCategoriesAdded = true;
          productsMeasurementInserted.push(product);
        } else {
          // If product exists, update its measurements, MeasurmentVoiceRecording, and MeasurmentSizePreference
          existingCustomerMesurment.products[existingCategoryIndex].mesurments =
            product.mesurments;
          existingCustomerMesurment.products[
            existingCategoryIndex
          ].MeasurmentVoiceRecording = product.MeasurmentVoiceRecording;
          existingCustomerMesurment.products[
            existingCategoryIndex
          ].MeasurmentSizePreference = product.MeasurmentSizePreference;
          updated = true;
          productsMeasurementUpdated.push(product);
        }
      }

      if (updated || newCategoriesAdded) {
        try {
          await existingCustomerMesurment.save();
        } catch (err) {
          console.error("Error saving measurement alteration:", err);
          return res.status(500).json({
            message: "Failed to save updated measurement alteration",
            error: err.message,
          });
        }

        let message = "";
        if (updated && newCategoriesAdded) {
          message =
            "Measurement Altreation entry updated with existing and new products";
        } else if (updated) {
          message =
            "Measurement Altreation entry updated with existing products";
        } else {
          message = "New products added to the measurement entry";
        }

        let data = {};
        if (productsMeasurementUpdated.length > 0) {
          data.productsMeasurementUpdatedCount =
            productsMeasurementUpdated.length;
        }
        if (productsMeasurementInserted.length > 0) {
          data.productsMeasurementInsertedCount =
            productsMeasurementInserted.length;
        }

        return res.status(200).json({
          success: true,
          message,
          data,
          existingCustomerMesurment,
        });
      }
    } else {
      // If no measurementAlterationID, create a new customer measurement
      const newCustomerMesurmentAlteration = new MeasureAlteration({
        stylish_id: _id,
        customerId,
        orderId,
        products,
      });

      const savedCustomerMesurmentAlteration =
        await newCustomerMesurmentAlteration.save();

      orderStatus.measurementAlterationID =
        savedCustomerMesurmentAlteration._id;
      await orderStatus.save();

      return res.status(201).json({
        success: true,
        message: "Measurement Altreation saved successfully",
        orderStatus,
        savedCustomerMesurmentAlteration,
      });
    }
  } catch (error) {
    console.error("Error creating/updating customer mesurment:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const createAlterationSpecialInstruction = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { customerId, products, order_number, orderId } = req.body;

    const findCustomer = await OnlineCustomers.findOne({
      _id: mongoose.Types.ObjectId(customerId),
    });
    if (!findCustomer)
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    // Check if customerMesurment already exists for the given customerId and orderNumber
    let orderStatus = await Order.findOne({
      _id: mongoose.Types.ObjectId(orderId),
      stylishs: { $in: [mongoose.Types.ObjectId(_id)] },
      customer_id: mongoose.Types.ObjectId(customerId),
      order_status: "processing",
    });
    console.log({ orderStatus });
    if (!orderStatus || !orderStatus.ProductAlterationID) {
      return res.status(400).json({
        success: false,
        message: "Please add product first!",
      });
    }

    const updatedProducts = [];
    const createdProducts = [];

    if (orderStatus.specialInstructionAlterationID) {
      const existingCustomerInstruction =
        await SpecialInstructionAlteration.findOne({
          stylish_id: _id,
          customerId,
          orderId,
        });

      if (existingCustomerInstruction) {
        for (const product of products) {
          const existingProduct = existingCustomerInstruction.products.find(
            (prod) => prod.productId.toString() === product.productId.toString()
          );

          if (existingProduct) {
            existingProduct.specialInstructions = product.specialInstructions;
            updatedProducts.push(existingProduct);
          } else {
            existingCustomerInstruction.products.push(product);
            createdProducts.push(product);
          }
        }

        if (updatedProducts.length > 0 || createdProducts.length > 0) {
          await existingCustomerInstruction.save();
        }
      }
    } else {
      const newCustomerSpecialInstructionAlteration =
        new SpecialInstructionAlteration({
          stylish_id: _id,
          customerId,
          products,
          orderId,
        });

      const savedCustomerSpecialInstructionAlteration =
        await newCustomerSpecialInstructionAlteration.save();

      orderStatus.specialInstructionAlterationID =
        savedCustomerSpecialInstructionAlteration._id;
      await orderStatus.save();

      createdProducts.push(...products);
    }

    return res.status(200).json({
      message: "Special instruction processed successfully.",
      customerID: customerId,
      stylist_id: _id,
      updatedProducts,
      createdProducts,
    });
  } catch (error) {
    next(error);
  }
};

const markedStatus = async (req, res, next) => {
  const { markedStatus, customerId, orderId } = req.body;
  const { email, _id } = req.user;

  try {
    const findCustomer = await OnlineCustomers.findOne({
      _id: mongoose.Types.ObjectId(customerId),
    });
    if (!findCustomer)
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    // Check if customerMesurment already exists for the given customerId and orderNumber
    let orderStatus = await Order.findOne({
      _id: mongoose.Types.ObjectId(orderId),
      stylishs: { $in: [mongoose.Types.ObjectId(_id)] },
      customer_id: mongoose.Types.ObjectId(customerId),
      order_status: "processing",
    });

    if (!orderStatus) {
      return next(new AppError("No Data to save!", 400));
    }

    if (orderStatus.markedStatus === true) {
      return next(new AppError("Order is already completed", 400));
    }

    // let latestOrderNumber = await orderStatus
    //   .findOne({
    //     storeID: storeId,
    //   })
    //   .sort({ orderNumber: -1 });

    if (markedStatus === true) {
      if (!orderStatus.markedStatus || orderStatus.markedStatus === false) {
        if (orderStatus.billInvoiceID) {
          const billInvoice = await dbServices.findById(
            CustomerInvoice,
            orderStatus.billInvoiceID
          );
          if (!billInvoice)
            return next(new AppError("Please complete billing first!", 400));

          orderStatus.markedStatus = true;

          // if (!orderStatus.order_number) {
          //   const newOrderNumber = await OthersService.createOrderNumber(
          //     latestOrderNumber,
          //     storeId
          //   );
          //   if (newOrderNumber) {
          //     orderStatus.orderNumber = newOrderNumber;
          //   } else {
          //     return next(
          //       new AppError("Order number failed to be created", 400)
          //     );
          //   }
          // }

          // const products = await CustomerProduct.findById(
          //   orderStatus.productID
          // );
          const productIds = orderStatus.products ? orderStatus.products : [];

          // if (orderStatus.readyMadeProductID) {
          //   const readymadeProducts = await CustomerReadymadeProduct.findById(
          //     orderStatus.readyMadeProductID
          //   );
          //   const readymadeProductIds = readymadeProducts
          //     ? readymadeProducts.products.map((products) => products._id)
          //     : [];

          //   readymadeProductIds.forEach((productId) => {
          //     if (
          //       !orderStatus.notAssignedProductIds.some((p) =>
          //         p.productId.equals(productId)
          //       )
          //     ) {
          //       orderStatus.notAssignedProductIds.push({ productId });
          //     }
          //   });
          // }
          // /////
          // if (orderStatus.readyMadeAccessoriesID) {
          //   const readyMadeAccessories =
          //     await CustomerReadymadeAccessories.findById(
          //       orderStatus.readyMadeAccessoriesID
          //     );
          //   const readyMadeAccessoriesIds = readyMadeAccessories
          //     ? readyMadeAccessories.accessories.map(
          //         (accessorie) => accessorie._id
          //       )
          //     : [];
          //   readyMadeAccessoriesIds.forEach((productId) => {
          //     if (
          //       !orderStatus.notAssignedProductIds.some((p) =>
          //         p.productId.equals(productId)
          //       )
          //     ) {
          //       orderStatus.notAssignedProductIds.push({ productId });
          //     }
          //   });
          // }
          /////

          /////testing alteration//////
          if (orderStatus.ProductAlterationID) {
            const products = await ProductAlteration.findById(
              orderStatus.ProductAlterationID
            );
            const productIds = products
              ? products.product.map((product) => product._id)
              : [];

            productIds.forEach((productId) => {
              if (
                !orderStatus.notAssignedProductIds.some((p) =>
                  p.productId.equals(productId)
                )
              ) {
                orderStatus.notAssignedProductIds.push({ productId });
              }
            });
          }
          /////

          // productIds.forEach(productId => {
          //   if (!orderStatus.notAssignedProductIds.some(p => p.productId.equals(productId))) {
          //     orderStatus.notAssignedProductIds.push({ productId });
          //   }
          // });
          if (productIds && productIds.length > 0) {
            productIds.forEach((product) => {
              const alreadyExists = orderStatus.notAssignedProductIds.some(
                (p) => p.productId.equals(product)
              );

              if (!alreadyExists) {
                orderStatus.notAssignedProductIds.push({
                  productId: product,
                  // isHelper: product.isHelper || false,
                  // isEmbroidery: product.isEmbroidery || false,
                  // isLovojFabric: product.isLovojFabric || false,
                });
              }
            });
          }

          await orderStatus.save();

          const templates = "order-success";
          const replacements = {
            name: customer.customerName,
            order_number: orderStatus.order_number,
          };

          // const link = `${process.env.BACKEND_URL}/sdfdsiufbiu?storeId=sdfds&order_number=sudf`

          const message = `Thank You For Ordering. \nYour Order Placed Successfully.\nYour Order Number Is: ${orderStatus.order_number}. Visit: https://www.lovoj.com/`;
          const sms = await sendSMS(
            message,
            `91${customer?.phoneNumber}`,
            "Lovoj",
            process.env.AWS_ENTITY_ID,
            process.env.B2BORDER_COMPLETED_SMS_AWS_TEMPLATE_ID
          );
          if (!sms)
            return next(new AppError("Failed to send completion SMS.", 500));

          await sendEmailViaOneSignalwithoutTemplate({
            email: customer.email,
            order_number: orderStatus.order_number,
            name: customer.customerName,
            type: "Order-Success",
          });

          await sendEmailViaOneSignalwithoutTemplate({
            email,
            order_number: orderStatus.order_number,
            name: customer.customerName,
            type: "Admin-Order-Success",
          });

          const billEmailResult = await mailwithTemplate(
            customer.email,
            "Order Placed Successfully.",
            templates,
            "Order-Success",
            replacements
          );
          if (billEmailResult) {
            console.log(`Email sent successfully to: ${customer.email}`);
            const billingDetails = await orderStatus.aggregate(
              await CustomerService.billingDetailsPipelineService(orderStatus)
            );
            if (billingDetails.length === 0)
              return next(new AppError("Billing details not found.", 400));

            const pdfFilePath = await createBillPDF(
              billingDetails[0],
              storeInfo
            );
            if (pdfFilePath) {
              const billEmailResult = await billEmail(
                customer.email,
                "Billing Pdf",
                "Here is the Bill",
                pdfFilePath
              );
              if (billEmailResult) {
                console.log(`Email sent successfully to: ${customer.email}`);
                try {
                  fs.unlinkSync(pdfFilePath);
                  console.log(`PDF file deleted: ${pdfFilePath}`);
                } catch (error) {
                  console.error("Error deleting PDF file:", error);
                }
              } else {
                console.error("Failed to send email");
              }
            }
          }

          const notification = await sendNotificationByOnesignal(
            req.user.deviceToken,
            "Order Completed",
            "Your order has been completed successfully."
          );
          if (notification) {
            await NotificationModel.create({
              storeId,
              customerId,
              type: "Offline",
              message: "Your order has been completed successfully.",
              title: "Order Completed",
            });
          }
          try {
            const { pipeline } = CommonServices.commonPipelineService(
              { _id: orderStatus._id },
              { page: 1, limit: 1 }
            );
            let offlineOrders = await orderStatus.aggregate(pipeline);
            const offlineNotAssignedProductData =
              await OthersService.notAssignedProductsforWorkers(
                offlineOrders,
                "cutter"
              );

            const cleanedOfflineNotAssignedProductData =
              offlineNotAssignedProductData.filter(
                (item) => item && (!Array.isArray(item) || item.length > 0)
              );
            // OthersService.getNextRoleFromorderStatus(orderStatus,'',productId)
            if (cleanedOfflineNotAssignedProductData.length > 0) {
              emitToStore(
                storeId,
                "cutter",
                "worker_task",
                cleanedOfflineNotAssignedProductData
              );
            }

            const OfflinePipeline =
              await CustomerService.searchQuickOrderServiceWithPagination(
                { _id: orderStatus._id },
                1,
                1
              );
            if (!OfflinePipeline)
              return next(
                new AppError("Couldn't find offline pipeline", "404")
              );
            const b2bOrders = await orderStatus.aggregate(
              OfflinePipeline.pipeline
            );

            b2bOrders?.forEach((order) => {
              const productId = order?.productData?.[0]?.product?.[0]?._id;

              if (productId && order.orderStatus?.disputed?.length) {
                order.orderStatus.disputed = order.orderStatus.disputed.filter(
                  (item) => item.productId?.toString() === productId.toString()
                );
              }
            });
            if (b2bOrders.length > 0) {
              emitToStore(
                storeId,
                "admin",
                "designer_order_update",
                b2bOrders[0]
              );
            }
          } catch (ex) {
            console.log("FAILED TO EMIT DATA", ex);
          }

          return res.status(200).json({
            success: true,
            message: "Quick order status completed successfully!",
            orderStatus,
            billInvoice,
          });
        } else {
          return next(new AppError("Please complete billing first!", 400));
        }
      }
    }

    // if (markedStatus === false) {
    //   // const newOrderNumber = await OthersService.createOrderNumber(
    //   //   latestOrderNumber,
    //   //   storeId
    //   // );
    //   // if (newOrderNumber && !orderStatus.orderNumber) {
    //   //   orderStatus.orderNumber = newOrderNumber;
    //   // }

    //   if (orderStatus.readyMadeProductID) {
    //     await dbServices.findByIdAndRemove(
    //       CustomerReadymadeProduct,
    //       orderStatus.readyMadeProductID
    //     );
    //     orderStatus.readyMadeProductID = null;
    //   }

    //   if (orderStatus.readyMadeAccessoriesID) {
    //     await dbServices.findByIdAndRemove(
    //       CustomerReadymadeAccessories,
    //       orderStatus.readyMadeAccessoriesID
    //     );
    //     orderStatus.readyMadeAccessoriesID = null;
    //   }

    //   orderStatus.markedStatus = "Incomplete";
    //   await orderStatus.save();

    //   const notification = await sendNotificationByOnesignal(
    //     orderStatus.deviceToken,
    //     "Order Incomplete",
    //     "Your order is marked as incomplete. Please complete your order."
    //   );
    //   if (notification) {
    //     await NotificationModel.create({
    //       type: "Offline",
    //       storeId,
    //       customerId,
    //       message:
    //         "Your order is marked as incomplete. Please complete your order.",
    //       title: "Order Incomplete",
    //     });
    //   }

    //   const message = `Your order is marked as incomplete. Please complete your order with\nOrder Number : ${quickorderStatus?.orderNumber}. Visit: https://www.lovoj.com/`;
    //   const sms = await sendSMS(
    //     message,
    //     `91${customer?.phoneNumber}`,
    //     "Lovoj",
    //     process.env.AWS_ENTITY_ID,
    //     process.env.B2BORDER_INCOMPLETED_SMS_AWS_TEMPLATE_ID
    //   );
    //   const billEmailResult = await sendingEmail(
    //     customer.email,
    //     "Order Status",
    //     "Your order is marked as incomplete. Please complete your order."
    //   );
    //   if (billEmailResult) {
    //     console.log("Email sent successfully");
    //   } else {
    //     console.error("Failed to send email");
    //   }

    //   return res.status(200).json({
    //     success: true,
    //     message: "Quick order status marked as incomplete successfully!",
    //     orderStatus,
    //   });
    // }
  } catch (error) {
    console.error("Error marking quick order status:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const createCustomerInvoice = catchAsyncError(async (req, res, next) => {
  const storeId = req.user.storeId;
  const {
    orderId,
    customerId,
    CustomersSection,
    CoastSection,
    ProductSection,
    helperProducts,
    embroideryProducts,
  } = req.body;

  const findCustomer = await OnlineCustomers.findOne({
    _id: mongoose.Types.ObjectId(customerId),
  });
  if (!findCustomer)
    return res.status(404).json({
      success: false,
      message: "Customer not found",
    });
  // Check if customerMesurment already exists for the given customerId and orderNumber
  let orderStatus = await Order.findOne({
    _id: mongoose.Types.ObjectId(orderId),
    stylishs: { $in: [mongoose.Types.ObjectId(_id)] },
    customer_id: mongoose.Types.ObjectId(customerId),
    order_status: "processing",
  });

  if (!orderStatus) {
    return next(new AppError("No Data to save!", 400));
  }

  if (
    !orderStatus ||
    (!orderStatus.readyMadeProductID &&
      !orderStatus.readyMadeAccessoriesID &&
      !orderStatus.products.length === 0 &&
      !orderStatus.ProductAlterationID)
  ) {
    return next(
      new AppError("At least add customize or ready-made product.", 400)
    );
  }
  // if (!orderStatus.readyMadeProductID && !orderStatus.readyMadeAccessoriesID) {
  //   // if (orderStatus.productID && (!orderStatus.measurementID)) {
  //// if (orderStatus.productID ) {
  //     return next(new AppError("Products must be present with Customize Product", 400));
  //   }
  // }
  // if (helperProducts?.length > 0 || embroideryProducts?.length > 0) {
  //   const customerProduct = await CustomerProduct.findById(
  //     orderStatus.productID
  //   );

  //   if (customerProduct) {
  //     customerProduct.product.forEach((prod) => {
  //       const prodIdStr = String(prod._id);

  //       if (helperProducts.includes(prodIdStr)) {
  //         prod.isHelper = true;
  //       }

  //       if (embroideryProducts.includes(prodIdStr)) {
  //         prod.isEmbroidery = true;
  //       }
  //     });

  //     await customerProduct.save();
  //   }
  // }

  const data = {
    customerId,
    storeId,
    CustomersSection,
    CoastSection,
    ProductSection,
    OrderSection: [],
  };
  if (orderStatus.productID) {
    data.OrderSection.push({
      CustomizedProduct: {
        productId: orderStatus.products,
      },
    });
  }
  if (orderStatus.ProductAlterationID) {
    data.OrderSection.push({
      CustomizedProduct: {
        ProductAlterationID: orderStatus.ProductAlterationID,
      },
    });
  }
  if (orderStatus.readyMadeProductID) {
    data.OrderSection.push({
      ReadymadeProduct: {
        readymadeProductId: orderStatus.readyMadeProductID,
      },
    });
  }
  if (orderStatus.readyMadeAccessoriesID) {
    data.OrderSection.push({
      ReadymadeAccessories: {
        accessorieId: orderStatus.readyMadeAccessoriesID,
      },
    });
  }

  const newInvoice = new CustomerInvoice(data);
  const savedInvoice = await newInvoice.save();
  orderStatus.billInvoiceID = savedInvoice._id;
  orderStatus.save();

  res.status(201).json({
    status: true,
    message: "Bill invoice successfull",
    orderStatus,
    savedInvoice,
  });
});

const addSuperAdminProduct = async (req, res) => {
  try {
    const { name } = req.body;

    const existingProduct = await SuperadminProduct.findOne({ name });

    if (existingProduct) {
      res
        .status(400)
        .json({ message: "Product is already exist with this name" });
    }
    const newSuperadminProduct = new SuperadminProduct(req.body);
    const savedProduct = await newSuperadminProduct.save();

    return res.status(201).json({
      message: "New product created successfully.",
      savedProduct,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  addProduct,
  updateProduct,
  addProductContrastAndMeasurment,
  cartdata,
  deleteCartData,
  createOrder,
  newCreateOrder,
  getStylistAppointmentList,
  putStylistAppointment,
  updatePendingAppointments,
  updateProductsPricing,
  updateStatus,
  sendOtp,
  stylistAppointmentStatuses,
  stylistmyorder,
  adminmyorder,
  getCustomerDataByAppointmentId,
  searchSuperadminProducts,
  searchSuperadminMeasurements,
  searchSuperadminFabrics,
  searchDesignerCreation,
  deleteProductContrast,
  getMostPurchasedCategories,
  createAlterationProduct,
  createAlterationMesurment,
  createAlterationSpecialInstruction,
  markedStatus,
  createCustomerInvoice,
  addSuperAdminProduct,
};
