const Order = require("../models/order");
const { catchAsyncError } = require("../middleware/catchAsyncError");
const mongoose = require("mongoose");
const QuickOrderStatus = require("../models/quickorderStatus.model");
const CustomerService = require("../services/customer.service");
const { transformPopulatedFields } = require("../utils/Fields");
const Style = require("../models/Style");
const Contrast = require("../models/Contrast");
const Measurement = require("../models/Measurement");
const WorkerStatus = require("../models/worker_status");
const SpecialInstruction = require("../models/special_instruction");
const moment = require("moment");
const CustomerProduct = require("../models/customerProduct");
const customerProductAlteration = require("../models/customerProductAltration");
const CustomerReadymadeAccessories = require("../models/Customer_ReadymadeAccessories");
const CustomerReadymadeProduct = require("../models/Customer_ReadymadeProduct");
const CategoryStylesUpload = require("../models/CategoryStylesUpload");

const Expense = require("../models/Expense.Model");
const b2b_invoiceModel = require("../models/b2b_invoice.Model");
const DesginerCartModel = require("../models/DesginerCart.Model");
const Fabric = require("../models/fabric");

async function filterB2BOrders(orders, filter, type) {
  const result = [];
  console.log(orders.length, "length....................");
  for (const order of orders) {
    let productLength = 0;
    let productAlterationLength = 0;
    if (type === "b2b") {
      if (
        !order.quickOrderStatus?.ProductAlterationID &&
        !!order.quickOrderStatus?.ProductID
      )
        continue;
      const productData = await CustomerProduct.findById(
        order.quickOrderStatus?.productID
      );
      const productAlterationDataData =
        await customerProductAlteration.findById(
          order.quickOrderStatus?.ProductAlterationID
        );
      if (!productAlterationDataData && !productData) continue;

      productLength = productData?.product?.length || 0;
      productAlterationLength = productAlterationDataData?.product?.length || 0;
    }
    console.log(productLength, "productLength........................");
    const finalLength = productLength + productAlterationLength;

    const qcCompletedCount = Array.isArray(order.quickOrderStatus.QCStatus)
      ? order.quickOrderStatus.QCStatus.filter((e) => e.status === "Completed")
          .length
      : 0;

    const deliveryCompletedCount = Array.isArray(
      order.quickOrderStatus.deliveryStatus
    )
      ? order.quickOrderStatus.deliveryStatus.filter(
          (e) => e.status === "Completed"
        ).length
      : 0;
    switch (filter) {
      case "inProgress":
        if (
          qcCompletedCount < finalLength ||
          deliveryCompletedCount < finalLength
        ) {
          result.push(order);
        }
        break;

      case "readyToDeliver":
        if (
          qcCompletedCount === finalLength &&
          deliveryCompletedCount < finalLength
        ) {
          result.push(order);
        }
        break;

      case "deliver":
        if (deliveryCompletedCount === finalLength) {
          result.push(order);
        }
        break;
      case "inComplete":
        if (order.quickOrderStatus.markedStatus === "Incomplete") {
          result.push(order);
        }
        break;
    }
  }

  return result;
}

async function filterB2COrders(orders, filter) {
  const result = [];
  for (const order of orders) {
    const products = Array.isArray(order.products) ? order.products : [];
    const productLength = products.length;

    let qcCompletedCount = 0;
    let deliveryCompletedCount = 0;

    for (const product of products) {
      console.log(
        product.worker_status,
        "workerStatus.........................."
      );
      const statuses = Array.isArray(product.worker_status)
        ? product.worker_status
        : [];

      qcCompletedCount += statuses.filter(
        (s) => s.role === "qc" && s.status === "Completed"
      ).length;

      deliveryCompletedCount += statuses.filter(
        (s) => s.role === "devlivery" && s.status === "Completed"
      ).length;
    }
    console.log({ qcCompletedCount, deliveryCompletedCount });
    switch (filter) {
      case "inProgress":
        if (
          qcCompletedCount < productLength ||
          deliveryCompletedCount < productLength
        ) {
          result.push(order);
        }
        break;

      case "readyToDeliver":
        if (
          qcCompletedCount === productLength &&
          deliveryCompletedCount < productLength
        ) {
          result.push(order);
        }
        break;

      case "deliver":
        if (deliveryCompletedCount === productLength) {
          result.push(order);
        }
        break;

      case "inComplete":
        if (order.order_status === "processing") {
          result.push(order);
        }
        break;

      // default:
      //   console.log("Incorrect filter........................");
    }
  }

  return result;
}

function mapFilterToStatus(filter) {
  switch (filter) {
    case "inProgress":
      return "InProgress";
    case "readyToDeliver":
      return "QCDone";
    case "deliver":
      return "Delivered";
    case "inComplete":
      return "Incomplete";
    default:
      return "";
  }
}

exports.getDesignerOrder = catchAsyncError(async (req, res, next) => {
  const { storeId } = req.user;
  const query = req.query;
  const { active, status, qcstatus, fromDate, toDate, filter } = query;
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10; // Ensure the limit is 10
  const skip = (page - 1) * limit;
  const customer_id = req.query.customer_id;

  const type = query.type;
  const responseObject = { success: true, message: "Retrived Successfully" };

  let matchQuery = {
    orderNumber: { $exists: true },
  };
  let b2cmatchQuery = {
    $or: [
      {
        type: "product",
      },
      {
        type: "appointment",
      },
    ],
  };
  if (active) {
    b2cmatchQuery = {
      ...b2cmatchQuery,
      activeStatus: active === "false" ? false : true,
    };
  }
  if (customer_id) {
    matchQuery.customerID = mongoose.Types.ObjectId(customer_id);
    b2cmatchQuery.customer_id = mongoose.Types.ObjectId(customer_id);
  }
  if (query.orderId) {
    matchQuery._id = mongoose.Types.ObjectId(query.orderId);
  } else {
    if (!customer_id) {
      matchQuery.storeID = mongoose.Types.ObjectId(storeId);
      matchQuery.activeStatus = active === "false" ? false : true;
      matchQuery.status =
        status === undefined
          ? { $in: [true, false] }
          : status === "false"
          ? false
          : true;
      if (qcstatus) matchQuery["QCStatus.status"] = qcstatus;
    }
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      matchQuery.createdAt = {
        $gte: start,
        $lte: end,
      };
    }
  }
  if (type == "b2b" || !type) {
    const OfflinePipeline =
      await CustomerService.searchQuickOrderServiceWithPagination(
        matchQuery,
        page,
        // Math.ceil(limit )
        limit
      );
    if (!OfflinePipeline)
      return next(new AppError("Couldn't find offline pipeline", "404"));

    // console.log(JSON.stringify(OfflinePipeline.countPipeline));
    const b2bOrders = await QuickOrderStatus.aggregate(
      OfflinePipeline.pipeline
    );

    console.log(OfflinePipeline.countPipeline, "countPipeline................");

    const totalB2bOrders = await QuickOrderStatus.aggregate(
      OfflinePipeline.countPipeline
    );

    console.log({ totalB2bOrders });

    b2bOrders?.forEach((order) => {
      const productId = order?.productData?.[0]?.product?.[0]?._id;

      if (productId && order.quickOrderStatus?.disputed?.length) {
        order.quickOrderStatus.disputed =
          order.quickOrderStatus.disputed.filter(
            (item) => item.productId?.toString() === productId.toString()
          );
      }
    });
    const filteredB2BOrders = await filterB2BOrders(b2bOrders, filter, "b2b");
    // console.log(
    //   { filteredB2BOrders },
    //   "filteredB2BOrders.................................."
    // );
    const data = filter ? filteredB2BOrders : b2bOrders;
    let totalb2bOrders =
      totalB2bOrders.length > 0 ? totalB2bOrders[0].totalCount : 0;
    const totalb2bPages = Math.ceil(totalb2bOrders / limit);
    responseObject.b2b_orders = data;
    responseObject.totalPage = totalb2bPages;
    responseObject.page = page;
    responseObject.totalOrders = totalb2bOrders;
  }
  if (type == "b2c" || !type) {
    console.log(JSON.stringify(b2cmatchQuery));
    let b2cOrders = await Order.aggregate([
      // 1. Filter for product-type orders
      {
        $match: b2cmatchQuery,
      },
      // 2. Unwind the products array so each product is separate.
      {
        $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
      },
      // 3. Lookup product data for the current product.
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "product_data",
        },
      },
      // 4. Unwind the product_data array (should contain exactly one document).
      {
        $unwind: { path: "$product_data", preserveNullAndEmptyArrays: true },
      },
      // 5. Add the quantity from the order’s products array into product_data.
      {
        $addFields: {
          "product_data.quantity": "$products.quantity",
        },
      },
      // 6. Lookup customer addresses.
      {
        $lookup: {
          from: "customer_addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "address_data",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "stylist_id",
          foreignField: "_id",
          as: "stylist_data",
        },
      },
      // 7. Lookup online customer data.
      {
        $lookup: {
          from: "onlinecustomers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer_data",
        },
      },
      // 8. Lookup store data from the product.
      {
        $lookup: {
          from: "stores",
          localField: "product_data.store_id",
          foreignField: "_id",
          as: "store_data",
        },
      },
      // 9. Lookup fabric data from the product.
      {
        $lookup: {
          from: "fabrics",
          localField: "product_data.fabric_id",
          foreignField: "_id",
          as: "fabric_data",
        },
      },
      // 10. Lookup category data from the product.
      {
        $lookup: {
          from: "adminproductforusers",
          localField: "product_data.category_id",
          foreignField: "_id",
          as: "category_data",
        },
      },
      // 11. Unwind the single-document arrays where appropriate.
      {
        $unwind: { path: "$address_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$stylist_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$customer_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$store_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$fabric_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$category_data", preserveNullAndEmptyArrays: true },
      },
      // 12. (Optional) Filter orders by store if needed. This makes sure that the looked-up product's store matches.
      {
        $match: { "product_data.store_id": mongoose.Types.ObjectId(storeId) },
      },
      // 13. Group back orders by _id to reassemble the products array.
      {
        $group: {
          _id: "$_id",
          order_number: { $first: "$order_number" },
          total_amount: { $first: "$total_amount" },
          payment_status: { $first: "$payment_status" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          customer_data: { $first: "$customer_data" },
          address_data: { $first: "$address_data" },
          stylist_data: { $first: "$stylist_data" },
          // Reassemble the products array. We merge product_data with additional lookup info.
          products: {
            $push: {
              $mergeObjects: [
                "$product_data",
                { store_data: "$store_data" },
                { fabric_id: "$fabric_data" },
                { category_id: "$category_data" },
              ],
            },
          },
        },
      },

      // 14. Sort the orders.
      {
        $sort: { createdAt: -1 },
      },
      // 15. Apply pagination.
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      // 16. Project only the needed fields.
      {
        $project: {
          _id: 1,
          order_number: 1,
          total_amount: 1,
          payment_status: 1,
          order_status: 1,
          createdAt: 1,
          customer_data: 1,
          address_data: 1,
          products: 1,
          stylist_data: 1,
        },
      },
    ]);
    let totalb2cOrders = await Order.aggregate([
      // 1. Filter for product-type orders
      {
        $match: b2cmatchQuery,
      },
      // 2. Unwind the products array so each product is separate.
      {
        $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
      },
      // 3. Lookup product data for the current product.
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "product_data",
        },
      },
      // 4. Unwind the product_data array (should contain exactly one document).
      {
        $unwind: { path: "$product_data", preserveNullAndEmptyArrays: true },
      },
      // 5. Add the quantity from the order’s products array into product_data.
      {
        $addFields: {
          "product_data.quantity": "$products.quantity",
        },
      },
      // 6. Lookup customer addresses.
      {
        $lookup: {
          from: "customer_addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "address_data",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "stylist_id",
          foreignField: "_id",
          as: "stylist_data",
        },
      },
      // 7. Lookup online customer data.
      {
        $lookup: {
          from: "onlinecustomers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer_data",
        },
      },
      // 8. Lookup store data from the product.
      {
        $lookup: {
          from: "stores",
          localField: "product_data.store_id",
          foreignField: "_id",
          as: "store_data",
        },
      },
      // 9. Lookup fabric data from the product.
      {
        $lookup: {
          from: "fabrics",
          localField: "product_data.fabric_id",
          foreignField: "_id",
          as: "fabric_data",
        },
      },
      // 10. Lookup category data from the product.
      {
        $lookup: {
          from: "adminproductforusers",
          localField: "product_data.category_id",
          foreignField: "_id",
          as: "category_data",
        },
      },
      // 11. Unwind the single-document arrays where appropriate.
      {
        $unwind: { path: "$address_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$stylist_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$customer_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$store_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$fabric_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$category_data", preserveNullAndEmptyArrays: true },
      },
      // 12. (Optional) Filter orders by store if needed. This makes sure that the looked-up product's store matches.
      {
        $match: { "product_data.store_id": mongoose.Types.ObjectId(storeId) },
      },
      // 13. Group back orders by _id to reassemble the products array.
      {
        $group: {
          _id: "$_id",
          order_number: { $first: "$order_number" },
          total_amount: { $first: "$total_amount" },
          payment_status: { $first: "$payment_status" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          customer_data: { $first: "$customer_data" },
          address_data: { $first: "$address_data" },
          stylist_data: { $first: "$stylist_data" },
          // Reassemble the products array. We merge product_data with additional lookup info.
          products: {
            $push: {
              $mergeObjects: [
                "$product_data",
                { store_data: "$store_data" },
                { fabric_id: "$fabric_data" },
                { category_id: "$category_data" },
              ],
            },
          },
        },
      },

      // 14. Sort the orders.
      {
        $sort: { createdAt: -1 },
      },
      // 16. Project only the needed fields.
      {
        $project: {
          _id: 1,
          order_number: 1,
          total_amount: 1,
          payment_status: 1,
          order_status: 1,
          createdAt: 1,
          customer_data: 1,
          address_data: 1,
          products: 1,
          stylist_data: 1,
        },
      },
    ]);
    console.log(b2cOrders.length, "length,,,,,,,,,,,,,,,,,,,");
    // let totalb2cOrders = await Order.aggregate([
    //   { $match: b2cmatchQuery },
    //   { $group: { _id: null, totalCount: { $sum: 1 } } },
    //   // { $sort: sortQuery },
    //   { $sort: { createdAt: -1 } },
    // ]);

    console.log(totalb2cOrders.length, "totalb2cOrders...............");
    console.log(b2cOrders.length, "b2cOrders...............");

    b2cOrders = await Promise.all(
      b2cOrders.map(async (order) => {
        // Add await here
        order.products = await Promise.all(
          order.products.map(async (product_data) => {
            const product_id = product_data._id;
            let [
              styles,
              contrasts,
              measurements,
              worker_status,
              special_instructions,
            ] = await Promise.all([
              Style.find({ product_id }).lean(),
              Contrast.find({ product_id }).populate("fabric_id").lean(),
              Measurement.find({ product_id }).lean(),
              WorkerStatus.find({ product_id }).sort({ createdAt: -1 }).lean(),
              SpecialInstruction.find({ product_id })
                .sort({ createdAt: -1 })
                .lean(),
            ]);
            return {
              product_data,
              styles,
              contrasts,
              measurements,
              worker_status,
              special_instructions,
            };
            // return product
          })
        );

        return order;
      })
    );

    b2cOrders = transformPopulatedFields(b2cOrders);
    // const filteredB2COrders = await filterB2BOrders(b2cOrders, filter, "b2c");
    // const data = filter === ("inProgress" || "readyToDeliver" || "deliver" || "inComplete") ? filteredB2COrders : b2cOrders
    const totalb2cPages = Math.ceil(totalb2cOrders.length / limit);
    responseObject.b2c_orders = b2cOrders;
    responseObject.totalPage = totalb2cPages;
    responseObject.page = page;
    responseObject.totalOrders = totalb2cOrders.length;
  }

  return res.status(200).json(responseObject);
});

exports.getOrderDetails = catchAsyncError(async (req, res, next) => {
  // const { storeId } = req.user;
  const query = req.query;

  // const orderNumber = req.query.orderNumber;

  const orderNumber = req.params.id;

  if (!orderNumber) {
    return res.status(400).send("Order Number required");
  }
  const responseObject = { success: true, message: "Retrived Successfully" };

  let matchQuery = {
    orderNumber: orderNumber,
  };
  const checkB2bOrder = await QuickOrderStatus.findOne({ orderNumber });
  const checkB2cOrder = await Order.findOne({ order_number: orderNumber });
  if (checkB2bOrder) {
    const OfflinePipeline =
      await CustomerService.searchQuickOrderServiceWithPagination(
        matchQuery,
        1,
        Math.ceil(1 / 2)
      );
    if (!OfflinePipeline)
      return next(new AppError("Couldn't find offline pipeline", "404"));
    const b2bOrders = await QuickOrderStatus.aggregate(
      OfflinePipeline.pipeline
    );
    const filteredB2BOrders = await filterB2BOrders(b2bOrders, "", "b2b");
    console.log(
      { filteredB2BOrders },
      "filteredB2BOrders.................................."
    );
    const data = b2bOrders;
    responseObject.order_data = data.length > 0 ? data[0] : data;
  }
  if (checkB2cOrder) {
    let b2cOrders = await Order.aggregate([
      // 1. Filter for product-type orders
      {
        $match: { order_number: orderNumber },
      },
      // 2. Unwind the products array so each product is separate.
      {
        $unwind: { path: "$products", preserveNullAndEmptyArrays: true },
      },
      // 3. Lookup product data for the current product.
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "product_data",
        },
      },
      // 4. Unwind the product_data array (should contain exactly one document).
      {
        $unwind: { path: "$product_data", preserveNullAndEmptyArrays: true },
      },
      // 5. Add the quantity from the order’s products array into product_data.
      {
        $addFields: {
          "product_data.quantity": "$products.quantity",
        },
      },
      // 6. Lookup customer addresses.
      {
        $lookup: {
          from: "customer_addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "address_data",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "stylist_id",
          foreignField: "_id",
          as: "stylist_data",
        },
      },
      // 7. Lookup online customer data.
      {
        $lookup: {
          from: "onlinecustomers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer_data",
        },
      },
      // 8. Lookup store data from the product.
      {
        $lookup: {
          from: "stores",
          localField: "product_data.store_id",
          foreignField: "_id",
          as: "store_data",
        },
      },
      // 9. Lookup fabric data from the product.
      {
        $lookup: {
          from: "fabrics",
          localField: "product_data.fabric_id",
          foreignField: "_id",
          as: "fabric_data",
        },
      },
      // 10. Lookup category data from the product.
      {
        $lookup: {
          from: "adminproductforusers",
          localField: "product_data.category_id",
          foreignField: "_id",
          as: "category_data",
        },
      },
      // 11. Unwind the single-document arrays where appropriate.
      {
        $unwind: { path: "$address_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$stylist_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$customer_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$store_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$fabric_data", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$category_data", preserveNullAndEmptyArrays: true },
      },

      // 13. Group back orders by _id to reassemble the products array.
      {
        $group: {
          _id: "$_id",
          order_number: { $first: "$order_number" },
          total_amount: { $first: "$total_amount" },
          payment_status: { $first: "$payment_status" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          customer_data: { $first: "$customer_data" },
          address_data: { $first: "$address_data" },
          stylist_data: { $first: "$stylist_data" },
          // Reassemble the products array. We merge product_data with additional lookup info.
          products: {
            $push: {
              $mergeObjects: [
                "$product_data",
                { store_data: "$store_data" },
                { fabric_id: "$fabric_data" },
                { category_id: "$category_data" },
              ],
            },
          },
        },
      },
      // 14. Sort the orders.
      {
        $sort: { createdAt: -1 },
      },

      // 16. Project only the needed fields.
      {
        $project: {
          _id: 1,
          order_number: 1,
          total_amount: 1,
          payment_status: 1,
          order_status: 1,
          createdAt: 1,
          customer_data: 1,
          address_data: 1,
          products: 1,
          stylist_data: 1,
        },
      },
    ]);

    b2cOrders = await Promise.all(
      b2cOrders.map(async (order) => {
        // Add await here
        order.products = await Promise.all(
          order.products.map(async (product_data) => {
            const product_id = product_data._id;
            let [
              styles,
              contrasts,
              measurements,
              worker_status,
              special_instructions,
            ] = await Promise.all([
              Style.find({ product_id }).lean(),
              Contrast.find({ product_id }).populate("fabric_id").lean(),
              Measurement.find({ product_id }).lean(),
              WorkerStatus.find({ product_id }).sort({ createdAt: -1 }).lean(),
              SpecialInstruction.find({ product_id })
                .sort({ createdAt: -1 })
                .lean(),
            ]);
            return {
              product_data,
              styles,
              contrasts,
              measurements,
              worker_status,
              special_instructions,
            };
            // return product
          })
        );

        return order;
      })
    );

    b2cOrders = transformPopulatedFields(b2cOrders);
    responseObject.order_data = b2cOrders.length > 0 ? b2cOrders[0] : b2cOrders;
  }

  return res.status(200).json(responseObject);
});

exports.createOrUpdateStyle = async (req, res) => {
  try {
    const user_id = req.user._id;
    const storeId = req.user.storeID;
    const { category, options, style_name } = req.body;

    const data = await CategoryStylesUpload.findOneAndUpdate(
      { category, style_name }, // match condition
      {
        $set: {
          storeId,
          category,
          options,
          style_name,
          user: user_id,
        },
      },
      {
        new: true, // return the updated document
        upsert: true, // create if not exists
        runValidators: true, // apply schema validators
        setDefaultsOnInsert: true,
      }
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error in createOrUpdateStyle:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCustomStyles = async (req, res) => {
  try {
    const user = req.user._id;
    const { category, page = 1, limit = 10 } = req.query;

    const filter = { user };
    if (category) {
      filter.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [styles, total] = await Promise.all([
      CategoryStylesUpload.find(filter)
        .populate("category")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      CategoryStylesUpload.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: styles,
      metadata: {
        totalItems: total,
        totalPages,
        currentPage: parseInt(page),
        pageSize: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error in getStyles:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/******************************* Designer DashBoard Api's  **************************/
exports.getTopCustomersByOrders = async (req, res) => {
  try {
    const { storeId } = req.user;
    if (!storeId)
      return res.status(400).json({ message: "storeID is required in query." });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const matchStage = {
      storeID: new mongoose.Types.ObjectId(storeId),
      customerID: { $ne: null },
    };

    const aggregationPipeline = [
      { $match: matchStage },
      { $group: { _id: "$customerID", orderCount: { $sum: 1 } } },
      { $sort: { orderCount: -1 } },
      {
        $lookup: {
          from: "offlinecustomerb2cs",
          localField: "_id",
          foreignField: "_id",
          as: "customerData",
        },
      },
      { $unwind: "$customerData" },
      {
        $project: {
          customerID: "$_id",
          orderCount: 1,
          customerName: "$customerData.customerName",
          phoneNumber: "$customerData.phoneNumber",
          gender: "$customerData.gender",
          email: "$customerData.email",
          address: "$customerData.address",
          createdAt: "$customerData.createdAt",
        },
      },
      { $skip: skip },
      { $limit: limit },
    ];

    const [data, countAgg] = await Promise.all([
      QuickOrderStatus.aggregate(aggregationPipeline),
      QuickOrderStatus.aggregate([
        { $match: matchStage },
        { $group: { _id: "$customerID" } },
        { $count: "totalCustomers" },
      ]),
    ]);

    const totalCustomers = countAgg[0]?.totalCustomers || 0;

    res.status(200).json({
      message: "Top customers with most orders....",
      totalCustomers,
      currentPage: page,
      totalPages: Math.ceil(totalCustomers / limit),
      data,
    });
  } catch (error) {
    console.error("Error fetching top customers by orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.createExpense = catchAsyncError(async (req, res) => {
  try {
    const { title, items, category, date, notes } = req.body;
    const userId = req.user._id;
    const amount = items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    const expense = new Expense({
      title,
      items,
      amount,
      category,
      date,
      notes,
      createdBy: userId,
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
exports.deleteExpense = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const expense = await Expense.findOneAndDelete({
      _id: id,
      createdBy: userId,
    });

    if (!expense) {
      return res
        .status(404)
        .json({ error: "Expense not found or unauthorized" });
    }

    res.status(200).json({ message: "Expense deleted successfully", expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
exports.updateExpense = catchAsyncError(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, items, category, date, notes } = req.body;
    const userId = req.user._id;

    // Find the expense owned by the user
    const expense = await Expense.findOne({ _id: id, createdBy: userId });

    if (!expense) {
      return res
        .status(404)
        .json({ error: "Expense not found or unauthorized" });
    }

    // Calculate total amount from updated items
    const amount = items.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);

    // Update fields
    expense.title = title;
    expense.items = items;
    expense.amount = amount;
    expense.category = category;
    expense.date = date;
    expense.notes = notes;

    await expense.save();

    res.status(200).json({ message: "Expense updated successfully", expense });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
exports.getExpenses = catchAsyncError(async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const userId = req.user._id;

    const filter = { createdBy: userId };
    console.log(startDate, endDate);
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (category) {
      filter.category = category;
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    let totalAmount = 0;
    let itemCount = 0;

    expenses.forEach((exp) => {
      totalAmount += exp.amount;
      itemCount += exp.items.length;
    });

    res.status(200).json({
      expenses,
      summary: {
        expenseCount: expenses.length,
        totalAmount,
        itemCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
exports.getSales = catchAsyncError(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate are required in YYYY-MM-DD format.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // include full end date

    const invoices = await b2b_invoiceModel.find({
      createdAt: { $gte: start, $lte: end },
    });

    const totalSales = invoices.length;
    const totalBeforeTax = invoices.reduce(
      (sum, inv) => sum + (inv?.totals?.subTotal || 0),
      0
    );
    const totalAfterTax = invoices.reduce(
      (sum, inv) => sum + (inv?.totals?.grandTotal || 0),
      0
    );

    return res.json({
      totalSales,
      totalBeforeTax,
      totalAfterTax,
      invoices, // full details of all filtered invoices
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

exports.addtoCart = catchAsyncError(async (req, res) => {
  try {
    const { fabDashNumber, quantity, unit, roll_combinations } = req.body;
    const { _id: userId, storeNumber } = req.user;

    // Check if item already exists for user with same storeNumber + fabDashNumber
    const existingItem = await DesginerCartModel.findOne({
      userId,
      storeNumber,
      fabDashNumber,
    });

    if (existingItem) {
      // Update quantity and push new roll combinations
      existingItem.quantity += quantity;
      existingItem.roll_combinations.push(...roll_combinations);
      await existingItem.save();
      return res
        .status(200)
        .json({ message: "Cart updated", data: existingItem });
    }

    // Create new cart item
    const newItem = await DesginerCartModel.create({
      userId,
      storeNumber,
      fabDashNumber,
      quantity,
      unit,
      roll_combinations,
    });

    res.status(201).json({ message: "Item added to cart", data: newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
exports.getCart = catchAsyncError(async (req, res) => {
  try {
    const userId = req.user_id;
    const cartItems = await DesginerCartModel.find({ userId });

    if (!cartItems.length) {
      return res.status(404).json({ message: "No cart items found." });
    }

    const result = await Promise.all(
      cartItems.map(async (item) => {
        const fabric = await Fabric.findOne({
          fabDashNumber: item.fabDashNumber,
        });
        if (!fabric) {
          return {
            ...item.toObject(),
            fabricDetails: null,
            stockStatus: "Fabric not found",
          };
        }

        // Check each roll_combination
        const rollStatus = item.roll_combinations.map((roll) => {
          const matchedRoll = fabric.rolls.find(
            (fabRoll) => fabRoll.rollIdentity === roll.rollIdentity
          );
          if (!matchedRoll) {
            return {
              ...roll,
              available: false,
              message: "Roll not found in stock",
            };
          }
          if (matchedRoll.quantity < roll.quantity) {
            return {
              ...roll,
              available: false,
              message: `Insufficient stock. Available: ${matchedRoll.quantity}`,
            };
          }
          return {
            ...roll,
            available: true,
            message: "In stock",
          };
        });

        const outOfStock = rollStatus.some((r) => !r.available);

        return {
          ...item.toObject(),
          fabricDetails: fabric,
          rollStatus,
          stockStatus: outOfStock ? "Out of stock" : "Available",
        };
      })
    );

    res
      .status(200)
      .json({ message: "Cart items with fabric and stock info", data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

exports.getDesignerOrderWithPagination = catchAsyncError(
  async (req, res, next) => {
    const { storeId } = req.user;
    const {
      active,
      status,
      qcstatus,
      fromDate,
      toDate,
      filter,
      customer_id,
      orderId,
      type,
    } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const responseObject = { success: true, message: "Retrieved Successfully" };

    const matchQuery = { orderNumber: { $exists: true } };
    let b2cmatchQuery = {
      type: "product",
    };
    if (customer_id) {
      matchQuery.customerID = mongoose.Types.ObjectId(customer_id);
      b2cmatchQuery.customer_id = mongoose.Types.ObjectId(customer_id);
    }
    if (orderId) matchQuery._id = new mongoose.Types.ObjectId(orderId);

    if (!orderId && !customer_id) {
      matchQuery.storeID = new mongoose.Types.ObjectId(storeId);
      matchQuery.activeStatus = active === "false" ? false : true;
      matchQuery.status =
        status === undefined
          ? { $in: [true, false] }
          : status === "false"
          ? false
          : true;

      if (qcstatus) matchQuery["QCStatus.status"] = qcstatus;
      if (fromDate && toDate) {
        matchQuery.createdAt = {
          $gte: new Date(fromDate).setHours(0, 0, 0, 0),
          $lte: new Date(toDate).setHours(23, 59, 59, 999),
        };
      }
    }

    const withTimeout = (promise, ms = 60000) =>
      Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Operation timed out")), ms)
        ),
      ]);

    // ---------- B2B Orders ----------
    if (type === "b2b" || !type) {
      const aggPipeline = [
        { $match: matchQuery },
        {
          $lookup: {
            from: "customerinvoices",
            localField: "billInvoiceID",
            foreignField: "_id",
            as: "billingData",
          },
        },
        {
          $lookup: {
            from: "offlinecustomerb2cs",
            localField: "customerID",
            foreignField: "_id",
            as: "customerData",
          },
        },
        {
          $addFields: {
            DeliveryDate: {
              $first: {
                $map: {
                  input: { $first: "$billingData.CoastSection" },
                  as: "section",
                  in: "$$section.DeliveryDate",
                },
              },
            },
            urgentOrder: {
              $first: {
                $map: {
                  input: { $first: "$billingData.CustomersSection" },
                  as: "section",
                  in: "$$section.UrgentOrder",
                },
              },
            },
          },
        },
        {
          $addFields: {
            quickOrderStatus: {
              storeID: "$storeID",
              productID: "$productID",
              orderNumber: "$orderNumber",
              status: "$status",
              markedStatus: "$markedStatus",
              activeStatus: "$activeStatus",
              notAssignedProductIds: "$notAssignedProductIds",
              aligned: "$aligned",
              QCStatus: "$QCStatus",
              deliveryStatus: "$deliveryStatus",
              disputed: "$disputed",
              DeliveryDate: "$DeliveryDate",
              urgentOrder: "$urgentOrder",
            },
          },
        },
        {
          $project: {
            quickOrderStatus: 1,
            disputed: 1,
            createdAt: 1,
            customerData: {
              $map: {
                input: "$customerData",
                as: "cust",
                in: {
                  email: "$$cust.email",
                  customerName: "$$cust.customerName",
                  phoneNumber: "$$cust.phoneNumber",
                },
              },
            },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ];

      const [orders, countAgg] = await withTimeout(
        Promise.all([
          QuickOrderStatus.aggregate(aggPipeline),
          QuickOrderStatus.aggregate([
            { $match: matchQuery },
            { $count: "total" },
          ]),
        ]),
        60000
      );

      const totalOrders = countAgg?.[0]?.total || 0;

      if (!orders.length) {
        responseObject.b2b_orders = [];
        responseObject.total_b2b_order = totalOrders;
        responseObject.total_b2b_order_pages = Math.ceil(totalOrders / limit);
        return res.status(200).json(responseObject);
      }

      // Map and enrich orders
      for (const order of orders) {
        const phases = [
          "cutter",
          "mastertailor",
          "stitching",
          "QC",
          "delivery",
        ];
        const phaseWeight = 90 / phases.length;
        const qStatus = order.quickOrderStatus || {};

        const productIds = [
          ...(qStatus.notAssignedProductIds || []),
          ...(qStatus.deliveryStatus || []),
          ...(qStatus.QCStatus || []),
          ...(qStatus.aligned || []),
        ]
          .map((p) => String(p.productId))
          .filter(Boolean);

        let totalPercentage = 0;
        for (const pid of productIds) {
          let percent = 0;
          if (qStatus.markedStatus === "Completed") percent += 10;

          const deliveryDone = qStatus.deliveryStatus?.some(
            (d) => String(d.productId) === pid && d.status === "Completed"
          );
          const qcDone = qStatus.QCStatus?.some(
            (q) => String(q.productId) === pid && q.status === "Completed"
          );

          if (deliveryDone) percent += phaseWeight * phases.length;
          else if (qcDone) percent += phaseWeight * (phases.indexOf("QC") + 1);
          else {
            const aligned = qStatus.aligned?.find(
              (a) => String(a.productId) === pid
            );
            if (aligned) {
              const idx = phases.indexOf(aligned.alignedTo);
              percent +=
                aligned.alignedStatus && idx >= 0
                  ? phaseWeight * (idx + 1)
                  : idx > 0
                  ? phaseWeight * idx
                  : 0;
            }
          }
          totalPercentage += percent;
        }

        const avgPercent = productIds.length
          ? Math.min(100, Math.round(totalPercentage / productIds.length))
          : 0;

        qStatus.percentage = avgPercent;

        // Compute order status
        const totalProducts = 1; // placeholder
        const qcDoneCount = (qStatus.QCStatus || []).filter(
          (s) => s.status === "Completed"
        ).length;
        const deliveryDoneCount = (qStatus.deliveryStatus || []).filter(
          (s) => s.status === "Completed"
        ).length;

        let orderStatus = "F-progress";
        if (qStatus.markedStatus === "Incomplete") orderStatus = "Incomplete";
        else if (deliveryDoneCount === totalProducts) orderStatus = "Delivered";
        else if (qcDoneCount === totalProducts) orderStatus = "QCDone";
        else {
          const fProgressRoles = [
            "lovojCutter",
            "fabricDelivery",
            "sourcing",
            "cutter",
          ];
          const gProgressRoles = [
            "helper",
            "mastertailor",
            "embroidery",
            "stitching",
            "trims",
          ];
          const alignedEntries = qStatus.aligned || [];

          if (alignedEntries.some((a) => fProgressRoles.includes(a.alignedTo)))
            orderStatus = "F-progress";
          else if (
            alignedEntries.some(
              (a) =>
                gProgressRoles.includes(a.alignedTo) ||
                (a.alignedTo === "QC" && a.alignedStatus === false)
            )
          )
            orderStatus = "G-progress";
        }

        qStatus.orderStatus = orderStatus;
        order.quickOrderStatus = qStatus;
        order.totalProducts = totalProducts;
      }

      responseObject.total_b2b_order = totalOrders;
      responseObject.total_b2b_order_pages = Math.ceil(totalOrders / limit);
      responseObject.b2b_orders = orders;
    }

    if (type === "b2c" || !type) {
      let [b2cOrders, countb2cOrders] = await Promise.all([
        Order.find(b2cmatchQuery, {
          products: 1,
          customer_id: 1,
          type: 1,
          order_status: 1,
          order_number: 1,
          expected_delivery: 1,
          activeStatus: 1,
        })
          .populate([
            { path: "customer_id", select: "email fullName mobileNumber" },
          ])
          .skip(skip)
          .limit(limit),
        Order.countDocuments(b2cmatchQuery),
      ]);

      // Convert to plain objects before modifying
      b2cOrders = b2cOrders.map((orderDoc) => {
        const order = orderDoc.toObject();
        order.totalProducts = order.products?.length || 0;
        return order;
      });

      b2cOrders = transformPopulatedFields(b2cOrders);
      const totalPages = Math.ceil(countb2cOrders / limit);

      responseObject.total_b2c_order_pages = totalPages;
      responseObject.total_b2c_order = countb2cOrders;
      responseObject.b2c_orders = b2cOrders;
    }

    res.status(200).json(responseObject);
  }
);

// exports.getDesignerOrderWithPagination = catchAsyncError(
//   async (req, res, next) => {
//     const { storeId } = req.user;
//     const query = req.query;
//     const { active, status, qcstatus, fromDate, toDate, filter } = query;
//     const page = Number(query.page) || 1;
//     const limit = Number(query.limit) || 10; // Ensure the limit is 10
//     const skip = (page - 1) * limit;
//     const customer_id = req.query.customer_id;

//     const type = query.type;
//     const responseObject = { success: true, message: "Retrived Successfully" };

//     let matchQuery = {
//       orderNumber: { $exists: true },
//     };
//     let b2cmatchQuery = {
//       type: "product",
//     };
//     if (customer_id) {
//       matchQuery.customerID = mongoose.Types.ObjectId(customer_id);
//       b2cmatchQuery.customer_id = mongoose.Types.ObjectId(customer_id);
//     }
//     if (query.orderId) {
//       matchQuery._id = mongoose.Types.ObjectId(query.orderId);
//     } else {
//       if (!customer_id) {
//         matchQuery.storeID = mongoose.Types.ObjectId(storeId);
//         matchQuery.activeStatus = active === "false" ? false : true;
//         matchQuery.status =
//           status === undefined
//             ? { $in: [true, false] }
//             : status === "false"
//             ? false
//             : true;
//         if (qcstatus) matchQuery["QCStatus.status"] = qcstatus;
//       }

//       if (fromDate && toDate) {
//         const start = new Date(fromDate);
//         start.setHours(0, 0, 0, 0);

//         const end = new Date(toDate);
//         end.setHours(23, 59, 59, 999);

//         matchQuery.createdAt = {
//           $gte: start,
//           $lte: end,
//         };
//       }
//     }
//     if (type === "b2b" || !type) {
//       const b2bOrders = await QuickOrderStatus.aggregate([
//         { $match: matchQuery },
//         {
//           $lookup: {
//             from: "customerinvoices",
//             localField: "billInvoiceID",
//             foreignField: "_id",
//             as: "billingData",
//           },
//         },
//         {
//           $lookup: {
//             from: "offlinecustomerb2cs",
//             localField: "customerID",
//             foreignField: "_id",
//             as: "customerData",
//           },
//         },
//         {
//           $addFields: {
//             DeliveryDate: {
//               $first: {
//                 $map: {
//                   input: { $first: "$billingData.CoastSection" },
//                   as: "section",
//                   in: "$$section.DeliveryDate",
//                 },
//               },
//             },
//           },
//         },
//         {
//           $addFields: {
//             urgentOrder: {
//               $first: {
//                 $map: {
//                   input: { $first: "$billingData.CustomersSection" },
//                   as: "section",
//                   in: "$$section.UrgentOrder",
//                 },
//               },
//             },
//           },
//         },
//         {
//           $addFields: {
//             quickOrderStatus: {
//               storeID: "$storeID",
//               productID: "$productID",
//               ProductAlterationID: "$ProductAlterationID",
//               readyMadeProductID: "$readyMadeProductID",
//               readyMadeAccessoriesID: "$readyMadeAccessoriesID",
//               orderNumber: "$orderNumber",
//               status: "$status",
//               markedStatus: "$markedStatus",
//               activeStatus: "$activeStatus",
//               notAssignedProductIds: "$notAssignedProductIds",
//               aligned: "$aligned",
//               QCStatus: "$QCStatus",
//               deliveryStatus: "$deliveryStatus",
//               disputed: "$disputed",
//               DeliveryDate: "$DeliveryDate",
//               urgentOrder: "$urgentOrder",
//             },
//           },
//         },
//         {
//           $project: {
//             quickOrderStatus: 1,
//             disputed: 1,
//             createdAt: 1,
//             customerData: {
//               $map: {
//                 input: "$customerData",
//                 as: "cust",
//                 in: {
//                   email: "$$cust.email",
//                   customerName: "$$cust.customerName",
//                   phoneNumber: "$$cust.phoneNumber",
//                 },
//               },
//             },
//           },
//         },
//         { $sort: { createdAt: -1 } },
//         { $skip: skip },
//         { $limit: limit },
//       ]);

//       // console.log(
//       //   b2bOrders[0].quickOrderStatus,
//       //   "b2bOrders[0].quickOrderStatus"
//       // );

//       const countb2bOrders = await QuickOrderStatus.aggregate([
//         {
//           $match: matchQuery,
//         },
//         { $group: { _id: null, totalCount: { $sum: 1 } } },
//       ]);

//       // Add totalProducts and orderStatus
//       for (const order of b2bOrders) {
//         let totalProducts = 0;
//         const {
//           productID,
//           ProductAlterationID,
//           readymadeProductID,
//           readymadeAccessoriesID,
//         } = order.quickOrderStatus || {};

//         if (productID) {
//           const productDoc = await CustomerProduct.findById(productID, {
//             product: 1,
//           });
//           totalProducts += productDoc?.product?.length || 0;
//         }

//         if (ProductAlterationID) {
//           const alterationDoc = await customerProductAlteration.findById(
//             ProductAlterationID,
//             { product: 1 }
//           );
//           totalProducts += alterationDoc?.product?.length || 0;
//         }

//         if (readymadeProductID) {
//           const readymadeDoc = await CustomerReadymadeProduct.findById(
//             readymadeProductID,
//             { products: 1 }
//           );
//           totalProducts += readymadeDoc?.products?.length || 0;
//         }

//         if (readymadeAccessoriesID) {
//           const accessoryDoc = await CustomerReadymadeAccessories.findById(
//             readymadeAccessoriesID,
//             { accessories: 1 }
//           );
//           totalProducts += accessoryDoc?.accessories?.length || 0;
//         }

//         order.totalProducts = totalProducts;

//         const phases = [
//           "cutter",
//           "mastertailor",
//           "stitching",
//           "QC",
//           "delivery",
//         ];
//         const phaseWeight = 90 / phases.length;

//         // Collect all product IDs from various sections
//         const productIdsSet = new Set();
//         [
//           ...(order.quickOrderStatus.notAssignedProductIds || []),
//           ...(order.quickOrderStatus.deliveryStatus || []),
//           ...(order.quickOrderStatus.QCStatus || []),
//           ...(order.quickOrderStatus.aligned || []),
//         ].forEach((item) => {
//           if (item.productId) productIdsSet.add(item.productId.toString());
//         });
//         const productIds = Array.from(productIdsSet);

//         let totalPercentage = 0;

//         // for (const productId of productIds) {
//         //   let productPercent = 0;

//         //   // Always add 10% if markedStatus is Completed
//         //   if (order.quickOrderStatus.markedStatus === "Completed") {
//         //     productPercent += 10;
//         //   }

//         //   // Track progress
//         //   let currentProgressIndex = -1;

//         //   // Check aligned status first
//         //   const alignedEntry = order.quickOrderStatus.aligned?.find(
//         //     (a) => a.productId?.toString() === productId
//         //   );

//         //   if (alignedEntry) {
//         //     currentProgressIndex = phases.indexOf(alignedEntry.alignedTo);
//         //     if (
//         //       alignedEntry.alignedStatus === true &&
//         //       currentProgressIndex >= 0
//         //     ) {
//         //       productPercent += phaseWeight * (currentProgressIndex + 1); // +1 to include current
//         //     } else if (
//         //       alignedEntry.alignedStatus === false &&
//         //       currentProgressIndex > 0
//         //     ) {
//         //       productPercent += phaseWeight * currentProgressIndex; // Only up to previous
//         //     }
//         //   } else {
//         //     // Check fallback for QC or delivery
//         //     const qcDone = order.quickOrderStatus.QCStatus?.some(
//         //       (q) =>
//         //         q.productId?.toString() === productId &&
//         //         q.status === "Completed"
//         //     );
//         //     const deliveryDone = order.quickOrderStatus.deliveryStatus?.some(
//         //       (d) =>
//         //         d.productId?.toString() === productId &&
//         //         d.status === "Completed"
//         //     );

//         //     if (deliveryDone) {
//         //       productPercent += phaseWeight * phases.length; // all
//         //     } else if (qcDone) {
//         //       const qcIndex = phases.indexOf("QC");
//         //       productPercent += phaseWeight * (qcIndex + 1); // all up to QC
//         //     }
//         //   }

//         //   totalPercentage += productPercent;
//         // }
//         for (const productId of productIds) {
//           let productPercent = 0;

//           // Always add 10% if markedStatus is Completed
//           if (order.quickOrderStatus.markedStatus === "Completed") {
//             productPercent += 10;
//           }

//           // Step 1: Check highest actual phase completed
//           const deliveryDone = order.quickOrderStatus.deliveryStatus?.some(
//             (d) =>
//               d.productId?.toString() === productId && d.status === "Completed"
//           );

//           const qcDone = order.quickOrderStatus.QCStatus?.some(
//             (q) =>
//               q.productId?.toString() === productId && q.status === "Completed"
//           );

//           if (deliveryDone) {
//             productPercent += phaseWeight * phases.length; // 100% (excluding 10% above)
//           } else if (qcDone) {
//             const qcIndex = phases.indexOf("QC");
//             productPercent += phaseWeight * (qcIndex + 1);
//           } else {
//             // Fallback: check alignedTo phase only if QC and Delivery are not done
//             const alignedEntry = order.quickOrderStatus.aligned?.find(
//               (a) => a.productId?.toString() === productId
//             );

//             if (alignedEntry) {
//               const currentProgressIndex = phases.indexOf(
//                 alignedEntry.alignedTo
//               );
//               if (
//                 alignedEntry.alignedStatus === true &&
//                 currentProgressIndex >= 0
//               ) {
//                 productPercent += phaseWeight * (currentProgressIndex + 1);
//               } else if (
//                 alignedEntry.alignedStatus === false &&
//                 currentProgressIndex > 0
//               ) {
//                 productPercent += phaseWeight * currentProgressIndex;
//               }
//             }
//           }

//           totalPercentage += productPercent;
//         }

//         // console.log({ totalPercentage });

//         const avgPercent = productIds.length
//           ? Math.min(100, Math.round(totalPercentage / productIds.length))
//           : 0;

//         order.quickOrderStatus.percentage = avgPercent;

//         // Step 3: Order Status
//         const qcDoneCount =
//           order.quickOrderStatus.QCStatus?.filter(
//             (s) => s.status === "Completed"
//           ).length || 0;
//         const deliveryDoneCount =
//           order.quickOrderStatus.deliveryStatus?.filter(
//             (s) => s.status === "Completed"
//           ).length || 0;

//         // let orderStatus = "InProgress";
//         // if (order.quickOrderStatus.markedStatus === "Incomplete") {
//         //   orderStatus = "Incomplete";
//         // } else if (deliveryDoneCount === totalProducts && totalProducts > 0) {
//         //   orderStatus = "Delivered";
//         // } else if (
//         //   qcDoneCount === totalProducts &&
//         //   deliveryDoneCount < totalProducts
//         // ) {
//         //   orderStatus = "QCDone";
//         // }

//         let orderStatus = "F-progress";

//         if (order.quickOrderStatus.markedStatus === "Incomplete") {
//           orderStatus = "Incomplete";
//         } else if (deliveryDoneCount === totalProducts && totalProducts > 0) {
//           orderStatus = "Delivered";
//         } else if (
//           qcDoneCount === totalProducts &&
//           deliveryDoneCount < totalProducts
//         ) {
//           orderStatus = "QCDone";
//         } else {
//           const fProgressRoles = [
//             "lovojCutter",
//             "fabricDelivery",
//             "sourcing",
//             "cutter",
//           ];
//           const gProgressRoles = [
//             "helper",
//             "mastertailor",
//             "embroidery",
//             "stitching",
//             "trims",
//           ];

//           const alignedEntries = order.quickOrderStatus.aligned || [];

//           if (
//             alignedEntries.some((a) => fProgressRoles.includes(a.alignedTo))
//           ) {
//             orderStatus = "F-progress";
//           } else if (
//             alignedEntries.some(
//               (a) =>
//                 gProgressRoles.includes(a.alignedTo) ||
//                 (a.alignedTo === "QC" && a.alignedStatus === false)
//             )
//           ) {
//             orderStatus = "G-progress";
//           }
//         }
//         order.quickOrderStatus.orderStatus = orderStatus;

//         order.quickOrderStatus.orderStatus = orderStatus;
//       }

//       // Optional filtering
//       const filteredOrders = filter
//         ? b2bOrders.filter(
//             (o) => o.quickOrderStatus?.orderStatus === mapFilterToStatus(filter)
//           )
//         : b2bOrders;

//       // console.log(countb2bOrders);
//       const totalPages = Math.ceil(countb2bOrders[0]?.totalCount / limit);

//       responseObject.total_b2b_order = countb2bOrders[0]?.totalCount;
//       responseObject.total_b2b_order_pages = totalPages;
//       responseObject.b2b_orders = filteredOrders;
//     }

//     if (type === "b2c" || !type) {
//       let [b2cOrders, countb2cOrders] = await Promise.all([
//         Order.find(b2cmatchQuery, {
//           products: 1,
//           customer_id: 1,
//           type: 1,
//           order_status: 1,
//           order_number: 1,
//           expected_delivery: 1,
//           activeStatus: 1,
//         })
//           .populate([
//             { path: "customer_id", select: "email fullName mobileNumber" },
//           ])
//           .skip(skip)
//           .limit(limit),
//         Order.countDocuments(b2cmatchQuery),
//       ]);

//       // Convert to plain objects before modifying
//       b2cOrders = b2cOrders.map((orderDoc) => {
//         const order = orderDoc.toObject();
//         order.totalProducts = order.products?.length || 0;
//         return order;
//       });

//       b2cOrders = transformPopulatedFields(b2cOrders);
//       const totalPages = Math.ceil(countb2cOrders / limit);

//       responseObject.total_b2c_order_pages = totalPages;
//       responseObject.total_b2c_order = countb2cOrders;
//       responseObject.b2c_orders = b2cOrders;
//     }

//     return res.status(200).json(responseObject);
//   }
// );

exports.getDesignerOrderInfo = catchAsyncError(async (req, res, next) => {
  const { storeId } = req.user;
  const query = req.query;
  const { orderId, type } = query;

  const responseObject = { success: true, message: "Retrived Successfully" };

  if (type == "b2b" || !type) {
    const OfflinePipeline =
      await CustomerService.searchQuickOrderServiceWithPagination({
        _id: orderId,
      });
    if (!OfflinePipeline)
      return next(new AppError("Couldn't find offline pipeline", "404"));

    console.log(JSON.stringify(OfflinePipeline.pipeline));
    const order = await QuickOrderStatus.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(orderId) } },
      {
        $lookup: {
          from: "customerproducts",
          localField: "productID",
          foreignField: "_id",
          as: "productData",
        },
      },
      {
        $lookup: {
          from: "customermesurments",
          localField: "measurementID",
          foreignField: "_id",
          as: "measurementData",
        },
      },
      {
        $lookup: {
          from: "customercontrasts",
          localField: "constrastID",
          foreignField: "_id",
          as: "contrastData",
        },
      },
      {
        $lookup: {
          from: "customerspacialinstructions",
          localField: "specialIntructionID",
          foreignField: "_id",
          as: "specialInstructionData",
        },
      },
      {
        $lookup: {
          from: "offlinecustomerb2cs",
          localField: "customerID",
          foreignField: "_id",
          as: "customerData",
        },
      },
      {
        $lookup: {
          from: "customerreadymadeproducts",
          localField: "readyMadeProductID",
          foreignField: "_id",
          as: "readymadeProductData",
        },
      },
      {
        $lookup: {
          from: "customerreadymadeaccessories",
          localField: "readyMadeAccessoriesID",
          foreignField: "_id",
          as: "readymadeAccessoriesData",
        },
      },
      {
        $lookup: {
          from: "customerproductalterations",
          localField: "ProductAlterationID",
          foreignField: "_id",
          as: "producAltreationtData",
        },
      },
      {
        $lookup: {
          from: "customermesurmentalterations",
          localField: "measurementAlterationID",
          foreignField: "_id",
          as: "measuremenAltreationtData",
        },
      },
      {
        $lookup: {
          from: "customerspacialinstructionaltreations",
          localField: "specialIntructionAlterationID",
          foreignField: "_id",
          as: "specialInstructionAltreationData",
        },
      },
      {
        $lookup: {
          from: "customerinvoices",
          localField: "billInvoiceID",
          foreignField: "_id",
          as: "billingData",
        },
      },
      {
        $addFields: {
          quickOrderStatus: {
            storeID: "$storeID",
            productID: "$productID",
            ProductAlterationID: "$ProductAlterationID",
            readyMadeProductID: "$readyMadeProductID",
            readyMadeAccessoriesID: "$readyMadeAccessoriesID",
            orderNumber: "$orderNumber",
            status: "$status",
            markedStatus: "$markedStatus",
            activeStatus: "$activeStatus",
            aligned: "$aligned",
            reAligned: "$reAligned",
            notAssignedProductIds: "$notAssignedProductIds",
            cutterStatus: "$cutterStatus",
            helperStatus: "$helperStatus",
            embroideryStatus: "$embroideryStatus",
            trimsStatus: "$trimsStatus",
            mastertailorStatus: "$mastertailorStatus",
            stitchingStatus: "$stitchingStatus",
            QCStatus: "$QCStatus",
            deliveryStatus: "$deliveryStatus",
            disputed: "$disputed",
          },
        },
      },
      {
        $project: {
          quickOrderStatus: 1,
          productData: {
            product: 1,
          },
          measurementData: {
            products: 1,
          },
          contrastData: {
            products: 1,
          },
          specialInstructionData: {
            products: 1,
          },
          producAltreationtData: {
            product: 1,
          },
          measuremenAltreationtData: {
            products: 1,
          },
          specialInstructionAltreationData: {
            products: 1,
          },
          readymadeProductData: {
            products: 1,
          },
          readymadeAccessoriesData: {
            accessories: 1,
          },
          billingData: "$billingData",
          billInvoiceID: "$billInvoiceID",
          customerData: "$customerData",
          disputed: "$disputed",
          createdAt: -1,
        },
      },
    ]);
    console.log({ order });
    responseObject.b2b_order = order;
  }
  if (type == "b2c" || !type) {
    console.log(orderId, "orderId.................");
    let order = await Order.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(orderId) },
      },
      {
        $unwind: {
          path: "$products",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product_id",
          foreignField: "_id",
          as: "product_data",
        },
      },
      {
        $unwind: {
          path: "$product_data",
          preserveNullAndEmptyArrays: false, // Fail fast if product doesn't exist
        },
      },
      // {
      //   $match: {
      //     "product_data.store_id": mongoose.Types.ObjectId(storeId), // <-- put after unwind
      //   },
      // },
      {
        $addFields: {
          "product_data.quantity": "$products.quantity",
        },
      },
      {
        $lookup: {
          from: "customer_addresses",
          localField: "address_id",
          foreignField: "_id",
          as: "address_data",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "stylist_id",
          foreignField: "_id",
          as: "stylist_data",
        },
      },
      {
        $lookup: {
          from: "onlinecustomers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer_data",
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "product_data.store_id",
          foreignField: "_id",
          as: "store_data",
        },
      },
      {
        $lookup: {
          from: "fabrics",
          localField: "product_data.fabric_id",
          foreignField: "_id",
          as: "fabric_data",
        },
      },
      {
        $lookup: {
          from: "adminproductforusers",
          localField: "product_data.category_id",
          foreignField: "_id",
          as: "category_data",
        },
      },
      { $unwind: { path: "$address_data", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$stylist_data", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$customer_data", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$store_data", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$fabric_data", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$category_data", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          order_number: { $first: "$order_number" },
          total_amount: { $first: "$total_amount" },
          payment_status: { $first: "$payment_status" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          customer_data: { $first: "$customer_data" },
          address_data: { $first: "$address_data" },
          stylist_data: { $first: "$stylist_data" },
          products: {
            $push: {
              $mergeObjects: [
                "$product_data",
                { store_data: "$store_data" },
                { fabric_id: "$fabric_data" },
                { category_id: "$category_data" },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          order_number: 1,
          total_amount: 1,
          payment_status: 1,
          order_status: 1,
          createdAt: 1,
          customer_data: 1,
          address_data: 1,
          products: 1,
          stylist_data: 1,
        },
      },
    ]);

    if (order.length === 0) {
      return res.status(404).json({ message: "No order found" });
    }

    order.products = await Promise.all(
      order[0]?.products?.map(async (product_data) => {
        const product_id = product_data._id;
        let [
          styles,
          contrasts,
          measurements,
          worker_status,
          special_instructions,
        ] = await Promise.all([
          Style.find({ product_id }).lean(),
          Contrast.find({ product_id }).populate("fabric_id").lean(),
          Measurement.find({ product_id }).lean(),
          WorkerStatus.find({ product_id }).sort({ createdAt: -1 }).lean(),
          SpecialInstruction.find({ product_id })
            .sort({ createdAt: -1 })
            .lean(),
        ]);
        return {
          product_data,
          styles,
          contrasts,
          measurements,
          worker_status,
          special_instructions,
        };
        // return product
      })
    );

    b2cOrders = transformPopulatedFields(order);
    responseObject.b2c_orders = b2cOrders;
  }

  return res.status(200).json(responseObject);
});
