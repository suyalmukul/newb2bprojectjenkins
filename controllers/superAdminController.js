const { catchAsyncError } = require("../middleware/catchAsyncError");
const Store = require("../models/stores");
const User = require("../models/user");
const { default: mongoose } = require("mongoose");
const QuickOrderStatus = require("../models/quickorderStatus.model");
const QuickOrderStatusOnline = require("../models/quickorderStatusB2C.model");
const CustomerService = require("../services/customer.service");
const Workers = require("../models/Worker.model");
const {
  commonPipelineService,
  showingResults,
  commonLoopkupIndependentPipelineService,
} = require("../services/common.service");
const CommonServices = require("../services/common.service");
const AppError = require("../utils/errorHandler");
const { sendingEmail } = require("../utils/sendingEmail");
const {
  SuperadmincommonPipelineService,
} = require("../services/superadminservices");
const { getIO } = require("../utils/setupSocket");
const Coupon = require("../models/coupanPage");
const { OfflineCustomerB2C } = require("../models/Customerb2c.offline");
const { OnlineCustomers } = require("../models/Customerb2c.online");
const OnlineCustomersMain = require("../models/OnlineCustomers.model");
const dbServices = require("../services/db.services");
const OthersService = require("../services/others.service");
const Asset = require("../models/superadmin_Assets");
const AssetModel = require("../models/Assets.model");
const axios = require("axios");
const ProductPricing = require("../models/ProductPricing.model");
const ProductShipping = require("../models/ProductShipping.model");
const CustomDesign = require("../models/customDesign");
const DesignInquiry = require("../models/DesignInquiry.model");
const personaldetails = require("../models/personalDet");
const factoryprofiles = require("../models/profileFactory");
const profileimages = require("../models/profileImage");
const Business = require("../models/BusinessDet");
const CategoryStylesUpload = require("../models/CategoryStylesUpload");
const ProductDropdown = require("../models/productDropdown");
const OtpModel = require("../models/otp");

const StylistAppointment = require("../models/StylistAppointments.model"); // Update path if needed
const userLoginAddress = require("../models/userLoginAddress");
const ProductAlteration = require("../models/productAlteration");
const MeasurementAlteration = require("../models/measurementAlteration");
const SpacialInstructionAltreation = require("../models/specialInstructionAlteration");

exports.getStoreState = catchAsyncError(async (req, res, next) => {
  // Find stores with flag false
  const stores = await Store.find({ flag: false }).exec();
  if (stores.length == 0) {
    return res.status(200).json({ message: "No stores found" });
  }

  res.status(200).json({
    success: true,
    count: stores.length,
    stores,
  });
});

exports.verifyStore = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  // Find the store by ID
  const store = await Store.findById(id).exec();
  if (!store) {
    return next(new AppError("Store not found", 404));
  }

  // Update the flag to true
  store.flag = true;
  await store.save();
  var replacements = store;
  var templates = "store-created-email";

  await sendingEmail(
    store?.email,
    "Account and Store Verified. Get the store number below",
    `${store?.storeNumber} use this Store number to Login to your store.`
  );

  res
    .status(200)
    .json({ success: true, message: "Store flag updated successfully", store });
});

// exports.storeProfileData = catchAsyncError(async (req, res, next) => {
//   const { id } = req.params;

//   const storeData = await Store.findById(id);
//   if (!storeData) {
//     return res.status(404).json({ message: "No store found" });
//   }

//   const userDataByEmail = await User.findOne({ email: storeData.email });
//   if (!userDataByEmail) {
//     return res.status(404).json({ message: "No user found" });
//   }

//   const storeBusinessData = await Business.findOne({
//     user: userDataByEmail._id,
//   });
//   const storeDataObject = storeData.toObject(); // Convert Mongoose document to plain object

//   res.status(200).json({
//     success: true,
//     storeData: storeDataObject,
//     user: userDataByEmail,
//     storeBusinessData: storeBusinessData,
//   });
// });

exports.storeProfileData = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const storeData = await Store.findById(id);
  if (!storeData) {
    return res.status(404).json({ message: "No store found" });
  }

  const userDataByEmail = await User.findOne({ email: storeData.email });
  if (!userDataByEmail) {
    return res.status(404).json({ message: "No user found" });
  }

  const [
    storeBusinessData,
    personalDetailsData,
    factoryProfileData,
    profileImagesData,
  ] = await Promise.all([
    Business.findOne({ user: userDataByEmail._id }),
    personaldetails.findOne({ user: userDataByEmail._id }),
    factoryprofiles.findOne({ user: userDataByEmail._id }),
    profileimages.findOne({ user: userDataByEmail._id }),
  ]);

  const storeDataObject = storeData.toObject();

  res.status(200).json({
    success: true,
    storeData: storeDataObject,
    user: userDataByEmail,
    storeBusinessData,
    personalDetailsData,
    factoryProfileData,
    profileImagesData,
  });
});

/************************* Get Admins and Workers Both *******************/
exports.superadminGetAllEntities = catchAsyncError(async (req, res, next) => {
  const { type } = req.params;
  const page = req.query.page || 1;

  if (!["user", "worker", "store"].includes(type)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request. Please provide a valid type (user/store/worker).",
    });
  }

  let entities;
  if (type === "user") {
    const { pipeline, countPipeline } = commonPipelineService({}, req.query);
    entities = await User.aggregate(pipeline);
    const countResult = await User.aggregate(countPipeline);
    totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
  }
  if (type === "store") {
    const { pipeline, countPipeline } = SuperadmincommonPipelineService(
      {},
      req.query
    );
    entities = await Store.aggregate(pipeline);
    const countResult = await Store.aggregate(countPipeline);
    totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
  } else {
    const { pipeline, countPipeline } = commonPipelineService({}, req.query);
    entities = await Workers.aggregate(pipeline);
    const countResult = await Workers.aggregate(countPipeline);
    totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;
  }

  if (!entities || entities.length === 0) {
    return next(new AppError(`No ${type}s found`, 404));
  }

  const showingResult = showingResults(req.query, totalCount);

  return res.status(200).json({
    success: true,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)}s found`,
    totalCount,
    page,
    showingResult,
    data: entities,
  });
});

/********** Deactive Active Accounts (Admins and Workers) Both ************/
exports.toggleActiveStatus = catchAsyncError(async (req, res, next) => {
  const { type, userId, activestatus } = req.body;

  if (
    !type ||
    (type !== "user" && type !== "worker") ||
    !userId ||
    activestatus === undefined
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request. Please provide valid type (user/worker), user/worker ID, and activestatus.",
    });
  }

  try {
    let updatedUser;
    if (type === "user") {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { activestatus } },
        { new: true }
      );
    } else {
      updatedUser = await Workers.findByIdAndUpdate(
        userId,
        { $set: { activestatus } },
        { new: true }
      );
    }

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User/Worker not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Active status toggled successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

/********************** All Order Listings For The Superadmin *********************/
// exports.getOrderListingSuperadmin = catchAsyncError(async (req, res, next) => {
//   const { storeId } = req.params;
//   // const { _id } = req.user;
//   const query = req.query;
//   const { status } = req.query;
//   const page = Number(query.page) || 1;
//   const limit = Number(query.limit) || 4;

//   let matchQuery = {};
//   if (query.orderId) {
//     matchQuery._id = ObjectId(query.orderId);
//   } else {
//     matchQuery = { storeID: mongoose.Types.ObjectId(storeId) };
//     matchQuery.status = status == "false" ? false : true;
//   }

//   const OfflinePipeline =
//     await CustomerService.searchQuickOrderServiceWithPagination(
//       matchQuery,
//       page,
//       limit
//     );
//   if (!OfflinePipeline)
//     return next(new AppError("Couldn't find offline pipeline", "404"));

//   const OnlinePipeline =
//     await CustomerService.searchOnlineOrdersServiceWithPagination(
//       matchQuery,
//       page,
//       limit
//     );
//   if (!OnlinePipeline)
//     return next(new AppError("Couldn't find Online pipeline", "404"));

//   const offlineCustomers = await QuickOrderStatus.aggregate(
//     OfflinePipeline.pipeline
//   );
//   const onlineCustomers = await QuickOrderStatusOnline.aggregate(
//     OnlinePipeline.pipeline
//   );

//   console.log("offlinecustomer", offlineCustomers);
//   console.log("onlinecustomer", onlineCustomers);

//   const countResultOffline = await QuickOrderStatus.aggregate(
//     OfflinePipeline.countPipeline
//   );
//   const countResultOnline = await QuickOrderStatusOnline.aggregate(
//     OnlinePipeline.countPipeline
//   );

//   let totalOfflineQuickOrders =
//     countResultOffline.length > 0 ? countResultOffline[0].totalCount : 0;
//   let totalOnlineQuickOrders =
//     countResultOnline.length > 0 ? countResultOnline[0].totalCount : 0;

//   // console.log("totalOfflineQuickOrders",totalOfflineQuickOrders)
//   // console.log("totalOnlineQuickOrders",totalOnlineQuickOrders)

//   const totalPagesOffline = Math.ceil(totalOfflineQuickOrders / limit);
//   const totalPagesOnline = Math.ceil(totalOnlineQuickOrders / limit);

//   // Assuming you want the maximum total pages between online and offline customers
//   const totalPages = Math.max(totalPagesOffline, totalPagesOnline);

//   return res.status(200).json({
//     success: true,
//     message: "Online and Offline Orders found successfully.",
//     totalOfflineQuickOrders,
//     totalOnlineQuickOrders,
//     totalPages,
//     PageNumber: page,
//     offlineCustomers,
//     onlineCustomers,
//   });
// });

exports.getOrderListingSuperadmin = catchAsyncError(async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const query = req.query;
    const { status } = req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 4;

    let matchQuery = {};

    // ✅ Case 1 — if orderId is given, filter by _id
    if (query.orderId) {
      if (mongoose.Types.ObjectId.isValid(query.orderId)) {
        matchQuery._id = mongoose.Types.ObjectId(query.orderId);
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid orderId format",
        });
      }
    }
    // ✅ Case 2 — if orderId not given, use storeId & status
    else {
      if (!mongoose.Types.ObjectId.isValid(storeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid storeId format",
        });
      }
      matchQuery = { storeID: mongoose.Types.ObjectId(storeId) };
      matchQuery.status = status == "false" ? false : true;
    }

    // ✅ Get offline orders
    const OfflinePipeline =
      await CustomerService.searchQuickOrderServiceWithPagination(
        matchQuery,
        page,
        limit
      );
    if (!OfflinePipeline)
      return next(new AppError("Couldn't find offline pipeline", 404));

    // ✅ Get online orders
    const OnlinePipeline =
      await CustomerService.searchOnlineOrdersServiceWithPagination(
        matchQuery,
        page,
        limit
      );
    if (!OnlinePipeline)
      return next(new AppError("Couldn't find online pipeline", 404));

    // ✅ Run both aggregations
    const offlineCustomers = await QuickOrderStatus.aggregate(
      OfflinePipeline.pipeline
    );
    const onlineCustomers = await QuickOrderStatusOnline.aggregate(
      OnlinePipeline.pipeline
    );

    console.log("🟠 Offline Customers:", offlineCustomers.length);
    console.log("🟢 Online Customers:", onlineCustomers.length);

    // ✅ Count totals
    const countResultOffline = await QuickOrderStatus.aggregate(
      OfflinePipeline.countPipeline
    );
    const countResultOnline = await QuickOrderStatusOnline.aggregate(
      OnlinePipeline.countPipeline
    );

    const totalOfflineQuickOrders =
      countResultOffline.length > 0 ? countResultOffline[0].totalCount : 0;
    const totalOnlineQuickOrders =
      countResultOnline.length > 0 ? countResultOnline[0].totalCount : 0;
    // ✅ Calculate total pages

    const totalPagesOffline = Math.ceil(totalOfflineQuickOrders / limit);
    const totalPagesOnline = Math.ceil(totalOnlineQuickOrders / limit);
    const totalPages = Math.max(totalPagesOffline, totalPagesOnline);

    // ✅ Send response
    return res.status(200).json({
      success: true,
      message: "Online and Offline Orders found successfully.",
      totalOfflineQuickOrders,
      totalOnlineQuickOrders,
      totalPages,
      PageNumber: page,
      offlineCustomers,
      onlineCustomers,
    });
  } catch (error) {
    console.error(" Error in getOrderListingSuperadmin:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

/*************************** Order Listing For Superadmin (Payment list) *************/
exports.getQuickOrdersOnline = catchAsyncError(async (req, res, next) => {
  // const { id } = req.user;
  const query = req.query;
  const { status, storeId } = req.query;
  const page = req.query.page || 1;
  let dynamicAddFields;

  const projectionFields = {
    billingData: 1,
    WorkerInfo: 1,
    createdAt: -1,
  };

  dynamicAddFields = {
    WorkerInfo: {
      storeId: "$storeID",
      billInvoiceID: "$billInvoiceID",
      orderNumber: "$orderNumber",
      createdAt: "$createdAt",
      updatedAt: "$updatedAt",
    },
  };
  const matchQuery = {
    ...(status && { orderStatus: status === "false" ? false : true }),
    ...(storeId && { storeID: mongoose.Types.ObjectId(storeId) }),
  };
  const lookupStage = [
    CommonServices.createLookupStage(
      "customerinvoiceonlines",
      "billInvoiceID",
      "_id",
      "billingData"
    ),
  ];

  const { pipeline, countPipeline } =
    CommonServices.commonLoopkupIndependentPipelineService(
      lookupStage,
      matchQuery,
      query,
      projectionFields,
      dynamicAddFields
    );

  let myOrders = await QuickOrderStatusOnline.aggregate(pipeline);

  const countResult = await QuickOrderStatusOnline.aggregate(countPipeline);
  let totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

  const showingResult = CommonServices.showingResults(query, totalCount);
  return res.json({
    success: true,
    message:
      myOrders.length > 0 ? "Orders found successfully" : "No orders found",
    totalCount,
    page,
    showingResult,
    count: myOrders.length,
    myOrders,
  });
});

/*******************Create coupons***********************/
exports.createCounpons = catchAsyncError(async (req, res, next) => {
  const {
    storeId,
    CouponName,
    PrecentageAmount,
    PriceAmount,
    ValidiyFrom,
    ValidiyTo,
    totalCoupon,
    applicablePrice,
    CategoryType,
    ProductType,
    cuponCode,
  } = req.body;

  let coupon;
  let data = {
    storeId,
    CouponName,
    PrecentageAmount,
    PriceAmount,
    ValidiyFrom,
    ValidiyTo,
    totalCoupon,
    applicablePrice,
    remainingCoupon: totalCoupon,
    CategoryType,
    ProductType,
    cuponCode,
  };

  // Check if a coupon with the same CouponName already exists
  coupon = await Coupon.findOne({ CouponName });

  // If a coupon is found and CouponName is "FIRSTTIME", return error
  if (coupon && CouponName === "FIRSTTIME") {
    return next(new AppError("Coupon already exists", 400));
  }

  // If CouponName is not "FIRSTTIME"
  if (CouponName !== "FIRSTTIME" || !coupon) {
    coupon = await dbServices.createDocument(Coupon, data);
  }

  res
    .status(201)
    .json({ success: true, message: "Coupon created successfully", coupon });
});

/******************** Get All Coupons List For Admin and Superadmin *************/
exports.getCouponForBoth = catchAsyncError(async (req, res, next) => {
  const { storeId, CouponName } = req.query;

  try {
    let coupons;

    if (storeId) {
      const storeObjectId = mongoose.Types.ObjectId(storeId);

      // Find the coupon based on storeId
      const coupon = await Coupon.find({ storeId: storeObjectId });

      // If coupon not found, return an error
      if (!coupon) {
        return res
          .status(404)
          .json({ success: false, message: "Coupon not found" });
      }

      coupons = coupon;
    }

    if (CouponName) {
      // Find the coupon based on CategoryType
      const coupon = await Coupon.find({ CouponName });

      if (!coupon) {
        return res
          .status(404)
          .json({ success: false, message: "Coupon not found" });
      }

      coupons = coupon;
    }

    if (!storeId && !CouponName) {
      // If no query params provided, return all coupons
      coupons = await Coupon.find();
    }

    // Return the coupon data
    res
      .status(200)
      .json({ success: true, message: "Coupons found successfully", coupons });
  } catch (error) {
    console.error("Error while fetching coupons:", error);
    return next(
      new AppError("An error occurred while fetching coupon data", 500)
    );
  }
});

/**********Get all coupons for OFFLINE users*************/
exports.getCounponsOffline = catchAsyncError(async (req, res, next) => {
  const { _id } = req.params;
  console.log("req.user", req.user);
  const { amount, storeId } = req.body;

  const customer = await OfflineCustomerB2C.findById(_id);
  if (!customer) return next(new AppError("Customer not found", 400));
  const currentDate = new Date();
  const previourOrder = await QuickOrderStatus.findOne({ customerID: _id });
  if (!previourOrder) {
    //Get valid coupons
    const coupons = await Coupon.find({
      $or: [
        {
          $and: [
            { storeId: mongoose.Types.ObjectId(storeId) },
            { remainingCoupon: { $gt: 0 } },
            { ValidiyFrom: { $lte: currentDate } },
            { ValidiyTo: { $gte: currentDate } },
          ],
        },
        { CategoryType: "FIRSTTIME" },
      ],
    });
    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      coupons,
    });
  } else {
    const coupons = await Coupon.find({
      // CategoryType: { $ne: "FIRSTTIME" },
      storeId: mongoose.Types.ObjectId(storeId),
      remainingCoupon: { $gt: 0 },
      ValidiyFrom: { $lte: currentDate },
      ValidiyTo: { $gte: currentDate },
    });

    res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      coupons,
    });
  }
});

/**********Get all coupons for OFFLINE users*************/
exports.getCounponsOnline = catchAsyncError(async (req, res, next) => {
  const { _id } = req.user;
  const { amount, storeId } = req.body;

  const customer = await OnlineCustomerB2C.findById(_id);
  if (!customer) return next(new AppError("Customer not found", 400));
  const currentDate = new Date();

  const previourOrder = await QuickOrderStatusOnline.findOne({
    customerID: _id,
  });

  if (!previourOrder) {
    //Get valid coupons
    const coupons = await Coupon.find({
      $or: [
        {
          $and: [
            { storeId: mongoose.Types.ObjectId(storeId) },
            { remainingCoupon: { $gt: 0 } },
            { ValidiyFrom: { $lte: currentDate } },
            { ValidiyTo: { $gte: currentDate } },
          ],
        },
        { CategoryType: "FIRSTTIME" },
      ],
    });
    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      coupons,
    });
  } else {
    const coupons = await Coupon.find({
      // CategoryType: { $ne: "FIRSTTIME" },
      storeId: mongoose.Types.ObjectId(storeId),
      remainingCoupon: { $gt: 0 },
      ValidiyFrom: { $lte: currentDate },
      ValidiyTo: { $gte: currentDate },
    });

    res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      coupons,
    });
  }
});

/************************** Permession For Stores to show or not ******************/
exports.toggleSuperAdminPermission = async (req, res) => {
  const io = await getIO();
  const { id } = req.params; // Retrieve storeId from request parameters
  try {
    const store = await Store.findById(id);
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    store.superAdminPermission = !store.superAdminPermission;
    await store.save();
    // Update superAdminPermission in the User collection
    await User.updateMany(
      { storeId: id },
      { superAdminPermission: store.superAdminPermission }
    );
    // console.log("Store updated:", store);
    const updatedUsers = await User.find({ storeId: id });
    // console.log("Users updated:", updatedUsers);

    // Socket emit
    const io = await getIO();
    if (io) {
      await io.emit("storeUpdatedforsuperadmin", store);
    }

    res.json({ message: "Super admin permission toggled successfully", store });
  } catch (error) {
    console.error("Error toggling super admin permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/************************** Permession For Stylish show or not ******************/
exports.toggleSuperAdminPermissionForStylish = async (req, res) => {
  const { id } = req.params;
  const { superAdminPermission, storeId, storeNumber } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (superAdminPermission !== undefined) {
      user.superAdminPermission = superAdminPermission;
    }

    if (storeId !== undefined) {
      user.storeId = storeId;
    }

    if (storeNumber !== undefined) {
      user.storeNumber = storeNumber;
    }

    await user.save();

    // Socket emit
    const io = await getIO();
    if (io) {
      await io.emit("stylishShowReqAccepted", user);
    }

    res.json({ message: "Super admin permission updated successfully", user });
  } catch (error) {
    console.error("Error updating super admin permission:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.changeStorePasswordBySuperAdmin = catchAsyncError(
  async (req, res, next) => {
    const { storeId, email, password } = req.body;

    const user = await User.findOne({
      storeId: mongoose.Types.ObjectId(storeId),
      email: email,
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.password = password;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  }
);

/********************** Online and Offline (B2C/B2B) Customers Listing ***************/

exports.OnlineOfflineCustomersListing = catchAsyncError(
  async (req, res, next) => {
    const query = req.query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 4;

    // Assuming matchQuery is defined properly
    const matchQuery = {}; // Replace with actual logic to determine the match query
    const { pipeline, countPipeline } = CommonServices.commonPipelineService(
      matchQuery,
      query
    );

    // Fetching offline and online customers
    let offlineCustomers = await OfflineCustomerB2C.aggregate(pipeline);
    let onlineCustomers = await OnlineCustomersMain.aggregate(pipeline);

    // Processing offline and online customers
    const offlineNotAssignedCustomersData =
      await OthersService.offlineCustomersForSuperadmin(offlineCustomers);
    const onlineNotAssignedCustomersData =
      await OthersService.onlineCustomersForSuperadmin(onlineCustomers);

    // Counting total customers
    const countResultOffline = await OfflineCustomerB2C.aggregate(
      countPipeline
    );
    const countResultOnline = await OnlineCustomersMain.aggregate(
      countPipeline
    );

    let totalOfflineCustomers =
      countResultOffline.length > 0 ? countResultOffline[0].totalCount : 0;
    let totalOnlineCustomers =
      countResultOnline.length > 0 ? countResultOnline[0].totalCount : 0;

    // Calculating the total pages for pagination
    const totalPagesOffline = Math.ceil(totalOfflineCustomers / limit);
    const totalPagesOnline = Math.ceil(totalOnlineCustomers / limit);
    const totalPages = Math.max(totalPagesOffline, totalPagesOnline);

    return res.status(200).json({
      success: true,
      message: "Online and Offline Customers found successfully.",
      totalOfflineCustomers,
      totalOnlineCustomers,
      totalPages,
      PageNumber: page,
      offlineNotAssignedCustomersData,
      onlineNotAssignedCustomersData,
    });
  }
);

/******************* Delete User/Worker/Stylish (Now delete only stylish) ************/
exports.deleteLoginMembers = catchAsyncError(async (req, res, next) => {
  const { id: _id } = req.query;
  const stylish = await User.findOne({ _id });
  // console.log("stylish", stylish);

  if (!stylish) {
    return res.status(404).send({ message: "Stylish data not found." });
  }

  await User.deleteOne({ _id }); // Delete the stylish data from the database

  return res
    .status(200)
    .send({ success: true, message: "Stylish deleted successfully." });
});

/******************************* Assets Data Upload **************************/
exports.createAsset = async (req, res) => {
  try {
    const { category, page, file, name, format } = req.body;

    // Create a new asset
    const newAsset = new Asset({
      category,
      page,
      file,
      name,
      format,
    });

    // Save the asset to the database
    const savedAsset = await newAsset.save();

    return res.status(201).json({
      success: true,
      message: "Asset created successfully!",
      data: savedAsset,
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.createAssetNew = async (req, res) => {
  try {
    const { category, page, file, name, format } = req.body;

    // Create and save the asset in PostgreSQL
    const newAsset = await AssetModel.create({
      category,
      page,
      file,
      name,
      format,
    });

    return res.status(201).json({
      success: true,
      message: "Asset created successfully!",
      data: newAsset,
    });
  } catch (error) {
    console.error("Error creating asset:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.getAssets = async (req, res) => {
  try {
    const { category, page, name, format } = req.query;

    let query = {};

    // Add filters based on query parameters
    if (category) query["category"] = category;
    if (page) query["page"] = page;
    if (name) query["name"] = { $regex: name, $options: "i" }; // Case-insensitive search
    if (format) query["format"] = format;

    // Fetch assets from the database
    const assets = await Asset.find(query);

    // Convert "format" to Base64 for files with type "image"
    const processedAssets = await Promise.all(
      assets.map(async (asset) => {
        if (asset.format === "image") {
          //format//file
          try {
            const response = await axios.get(asset.file, {
              responseType: "arraybuffer",
            });
            const base64 = Buffer.from(response.data, "binary").toString(
              "base64"
            );
            asset.file = `data:image/png;base64,${base64}`; // Update format to Base64 string
          } catch (err) {
            console.error(
              `Failed to convert URL to Base64 for asset ID ${asset._id}:`,
              err.message
            );
          }
        }
        return asset;
      })
    );

    return res.status(200).json({
      success: true,
      message: "Assets retrieved successfully!",
      data: processedAssets,
    });
  } catch (error) {
    console.error("Error retrieving assets:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
exports.getAssetsNew = async (req, res) => {
  try {
    const { category, page, name, format } = req.query;

    let whereClause = {};

    // Add filters based on query parameters
    if (category) whereClause.category = category;
    if (page) whereClause.page = page;
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` }; // Case-insensitive search
    if (format) whereClause.format = format;

    // Fetch assets from PostgreSQL
    const assets = await AssetModel.findAll({ where: whereClause });

    // Convert "format" to Base64 for files with type "image"

    return res.status(200).json({
      success: true,
      message: "Assets retrieved successfully!",
      data: assets,
    });
  } catch (error) {
    console.error("Error retrieving assets:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.createOrUpdateShipping = async (req, res) => {
  try {
    const { pricing_list, shipping_list, gender } = req.body;
    const { product_category } = req.params;

    if (!product_category) {
      return res.status(400).json({ error: "Product category is required" });
    }

    const pricingBulkOps = pricing_list.map(
      ({ name, note, image_url, price_range }) => ({
        updateOne: {
          filter: { product_category, name, gender },
          update: {
            $set: {
              product_category,
              name,
              price_range,
              note,
              image_url,
              gender,
            },
          },
          upsert: true,
        },
      })
    );

    const shippingBulkOps = shipping_list.map(
      ({ name, shipping_time, note, image_url }) => ({
        updateOne: {
          filter: { product_category, name, gender },
          update: {
            $set: {
              product_category,
              name,
              shipping_time,
              note,
              image_url,
              gender,
            },
          },
          upsert: true,
        },
      })
    );

    // Execute bulk write operations in parallel
    const [pricingResult, shippingResult] = await Promise.all([
      ProductPricing.bulkWrite(pricingBulkOps),
      ProductShipping.bulkWrite(shippingBulkOps),
    ]);

    res.json({
      message: "Product data updated successfully",
      pricing: pricingResult,
      shipping: shippingResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
exports.getShippingAndPricingDetails = async (req, res) => {
  try {
    const { product_category } = req.params;
    const { gender } = req.query;

    if (!product_category) {
      return res.status(400).json({ error: "Product category is required" });
    }

    // Fetch product pricing and shipping details for the given category
    const pricingDetails = await ProductPricing.find({
      product_category,
      gender,
    });
    const shippingDetails = await ProductShipping.find({
      product_category,
      gender,
    });

    res.json({
      message: "Product data retrieved successfully",
      pricing: pricingDetails,
      shipping: shippingDetails,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getCustomDesigns = async (req, res) => {
  const query = req.query;
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 15;
  const matchQuery = {};

  let [designInquery, countResultInqueryDesign] = await Promise.all([
    DesignInquiry.find({ isDeleted: false })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate([{ path: "design_id" }]),
    DesignInquiry.countDocuments(),
  ]);
  console.log(designInquery[0]?.design_id, "design_id..............");

  const totalPagesDesignInquery = Math.ceil(countResultInqueryDesign / limit);

  return res.status(200).json({
    success: true,
    message: "Custom designInquery found successfully.",
    designInquery,
    totalPagesDesignInquery,
    PageNumber: page,
  });
};

exports.getCustomStyles = async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category) {
      filter.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [styles, total] = await Promise.all([
      CategoryStylesUpload.find(filter)
        .populate("category")
        .populate("user")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      CategoryStylesUpload.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
      data: styles,
    });
  } catch (error) {
    console.error("Error in getCustomStyles:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/********************** Superadmin add product dropdownssssss ********************/

// ✅ Create
exports.createProduct = async (req, res) => {
  try {
    const data = await ProductDropdown.create(req.body);
    res.status(201).json({ message: "Created", data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Get All
exports.getAllProducts = async (req, res) => {
  try {
    const { gender, product_name } = req.query;

    // Build dynamic filter
    let filter = {};
    if (gender) filter.gender = gender;
    if (product_name) filter.product_name = product_name;

    const data = await ProductDropdown.find(filter);
    res.status(200).json({ message: "Fetched", data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Update by ID
exports.updateProduct = async (req, res) => {
  try {
    const updated = await ProductDropdown.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Updated", data: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ Delete by ID
exports.deleteProduct = async (req, res) => {
  try {
    const deleted = await ProductDropdown.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.status(200).json({ message: "Deleted", data: deleted });
  } catch (err) {
    res.status(400).json({ error: err.message });
    ("");
  }
};

/******************** Fetch Customersss Apointemenets List ******************/

// exports.getStylistAppointments = async (req, res) => {
//   try {
//     const {
//       id,
//       stylist_id,
//       customer_id,
//       status,
//       start_time_from,
//       start_time_to,
//       end_time_from,
//       end_time_to,
//       appointment_date_from,
//       appointment_date_to,
//       latest,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     // Get single appointment by ID
//     if (id) {
//       const appointmentDoc = await StylistAppointment.findById(id)
//         .populate("stylist_id")
//         .populate("customer_id")
//         .populate("address_id")
//         .populate({
//           path: "order_id",
//           populate: [
//             { path: "products.product_id", model: "Product" },
//             {
//               path: "associated_order_ids",
//               populate: { path: "products.product_id", model: "Product" },
//             },
//             { path: "ProductAlterationID", model: "productAlteration" },
//             { path: "measurementAlterationID", model: "MesurmentAlteration" },
//             {
//               path: "specialInstructionAlterationID",
//               model: "SpacialInstructionAltreation",
//             },
//           ],
//         });

//       if (!appointmentDoc) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Appointment not found" });
//       }

//       const appointment = appointmentDoc.toObject();

//       const {
//         stylist_id: stylistData,
//         customer_id: customerData,
//         address_id: addressData,
//         order_id: orderData,
//         ...rest
//       } = appointment;

//       if (orderData?.ProductAlterationID) {
//         orderData.productAlterationData = orderData.ProductAlterationID;
//         delete orderData.ProductAlterationID;
//       }

//       if (
//         orderData?.productAlterationData &&
//         orderData?.measurementAlterationID
//       ) {
//         const measurementData = orderData.measurementAlterationID;

//         orderData.productAlterationData.product =
//           orderData.productAlterationData.product.map((prod) => {
//             const matching = measurementData.products.find(
//               (m) => m.productId?.toString() === prod._id.toString()
//             );

//             if (matching) {
//               return {
//                 ...prod,
//                 measurements: matching.mesurments || [],
//                 measurementMeta: {
//                   type: matching.MeasurmentType,
//                   voiceRecording: matching.MeasurmentVoiceRecording,
//                   sizePreference: matching.MeasurmentSizePreference,
//                 },
//               };
//             }
//             return prod;
//           });
//       }

//       if (
//         orderData?.productAlterationData &&
//         orderData?.specialInstructionAlterationID
//       ) {
//         const specialInstructionData = orderData.specialInstructionAlterationID;

//         orderData.productAlterationData.product =
//           orderData.productAlterationData.product.map((prod) => {
//             const matching = specialInstructionData?.products.find(
//               (m) => m.productId?.toString() === prod._id.toString()
//             );

//             if (matching) {
//               return {
//                 ...prod,
//                 specialInstructions: matching.specialInstructions || [],
//               };
//             }
//             return prod;
//           });
//       }

//       if (orderData?.measurementAlterationID) {
//         delete orderData.measurementAlterationID;
//       }

//       if (orderData?.specialInstructionAlterationID) {
//         delete orderData.specialInstructionAlterationID;
//       }

//       return res.status(200).json({
//         success: true,
//         data: {
//           ...rest,
//           stylist_data: stylistData,
//           customer_data: customerData,
//           address_data: addressData,
//           order_data: orderData,
//         },
//       });
//     }

//     // Build filters
//     let filter = {};

//     if (stylist_id) filter.stylist_id = stylist_id;
//     if (customer_id) filter.customer_id = customer_id;
//     if (status) filter.status = status;

//     if (start_time_from || start_time_to) {
//       filter.start_time = {};
//       if (start_time_from) filter.start_time.$gte = new Date(start_time_from);
//       if (start_time_to) filter.start_time.$lte = new Date(start_time_to);
//     }

//     if (end_time_from || end_time_to) {
//       filter.end_time = {};
//       if (end_time_from) filter.end_time.$gte = new Date(end_time_from);
//       if (end_time_to) filter.end_time.$lte = new Date(end_time_to);
//     }

//     if (appointment_date_from || appointment_date_to) {
//       filter.appointment_date = {};
//       if (appointment_date_from)
//         filter.appointment_date.$gte = new Date(appointment_date_from);
//       if (appointment_date_to)
//         filter.appointment_date.$lte = new Date(appointment_date_to);
//     }

//     let query = StylistAppointment.find(filter)
//       .populate("stylist_id")
//       .populate("customer_id")
//       .populate("address_id")
//       .populate({
//         path: "order_id",
//         populate: [
//           {
//             path: "products.product_id",
//             model: "Product",
//           },
//           {
//             path: "associated_order_ids",
//             populate: {
//               path: "products.product_id",
//               model: "Product",
//             },
//           },
//           {
//             path: "ProductAlterationID",
//             model: "productAlteration",
//           },
//           {
//             path: "measurementAlterationID",
//             model: "MesurmentAlteration",
//           },
//           {
//             path: "specialInstructionAlterationID",
//             model: "SpacialInstructionAltreation",
//           },
//         ],
//       });

//     if (latest === "true") {
//       query.sort({ createdAt: -1 });
//     }

//     const skip = (Number(page) - 1) * Number(limit);
//     query.skip(skip).limit(Number(limit));

//     let appointments = await query.lean().exec();

//     appointments = await Promise.all(
//       appointments?.map(async (order) => {
//         const otp = await OtpModel.findOne({
//           order_id: {
//             $exists: true,
//             $ne: null,
//             $eq: order?.order_id?._id,
//           },
//           otp_key: { $ne: "111111" },
//         }).lean();
//         return {
//           ...order,
//           otp: otp?.otp_key || null,
//         };
//       })
//     );

//     const transformedResults = appointments.map((appointment) => {
//       const {
//         stylist_id: stylistData,
//         customer_id: customerData,
//         address_id: addressData,
//         order_id: orderData,
//         ...rest
//       } = appointment;

//       return {
//         ...rest,
//         stylist_data: stylistData,
//         customer_data: customerData,
//         address_data: addressData,
//         order_data: orderData,
//       };
//     });

//     return res.status(200).json({
//       success: true,
//       data: transformedResults,
//       page: Number(page),
//       limit: Number(limit),
//     });
//   } catch (error) {
//     console.error("Error fetching stylist appointments:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal Server Error" });
//   }
// };

/*************************************/

exports.getStylistAppointments = catchAsyncError(async (req, res) => {
  try {
    const {
      id,
      stylist_id,
      customer_id,
      status,
      start_time_from,
      start_time_to,
      end_time_from,
      end_time_to,
      appointment_date_from,
      appointment_date_to,
      latest,
      search, // ✅ search parameter
      page = 1,
      limit = 10,
    } = req.query;

    // ✅ Get single appointment by ID
    if (id) {
      const appointmentDoc = await StylistAppointment.findById(id)
        .populate("stylist_id")
        .populate("customer_id")
        .populate("address_id")
        .populate({
          path: "order_id",
          populate: [
            { path: "products.product_id", model: "Product" },
            {
              path: "associated_order_ids",
              populate: { path: "products.product_id", model: "Product" },
            },
            { path: "ProductAlterationID", model: "productAlteration" },
            { path: "measurementAlterationID", model: "MesurmentAlteration" },
            {
              path: "specialInstructionAlterationID",
              model: "SpacialInstructionAltreation",
            },
          ],
        });

      if (!appointmentDoc) {
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      }

      const appointment = appointmentDoc.toObject();

      const {
        stylist_id: stylistData,
        customer_id: customerData,
        address_id: addressData,
        order_id: orderData,
        ...rest
      } = appointment;

      return res.status(200).json({
        success: true,
        data: {
          ...rest,
          stylist_data: stylistData,
          customer_data: customerData,
          address_data: addressData,
          order_data: orderData,
        },
      });
    }

    // ✅ Build base filter
    let filter = {};
    if (stylist_id) filter.stylist_id = stylist_id;
    if (customer_id) filter.customer_id = customer_id;
    if (status) filter.status = status;

    // ✅ Date filters
    if (start_time_from || start_time_to) {
      filter.start_time = {};
      if (start_time_from) filter.start_time.$gte = new Date(start_time_from);
      if (start_time_to) filter.start_time.$lte = new Date(start_time_to);
    }

    if (end_time_from || end_time_to) {
      filter.end_time = {};
      if (end_time_from) filter.end_time.$gte = new Date(end_time_from);
      if (end_time_to) filter.end_time.$lte = new Date(end_time_to);
    }

    if (appointment_date_from || appointment_date_to) {
      filter.appointment_date = {};
      if (appointment_date_from)
        filter.appointment_date.$gte = new Date(appointment_date_from);
      if (appointment_date_to)
        filter.appointment_date.$lte = new Date(appointment_date_to);
    }

    // ✅ Fetch all appointments (filtered)
    let query = StylistAppointment.find(filter)
      .populate("stylist_id")
      .populate("customer_id")
      .populate("address_id")
      .populate({
        path: "order_id",
        populate: [
          { path: "products.product_id", model: "Product" },
          {
            path: "associated_order_ids",
            populate: { path: "products.product_id", model: "Product" },
          },
          { path: "ProductAlterationID", model: "productAlteration" },
          { path: "measurementAlterationID", model: "MesurmentAlteration" },
          {
            path: "specialInstructionAlterationID",
            model: "SpacialInstructionAltreation",
          },
        ],
      });

    if (latest === "true") {
      query = query.sort({ createdAt: -1 });
    }

    let appointments = await query.lean().exec();

    // ✅ SEARCH FILTER (appointment_number, status, type, or customer name)
    if (search && search.trim() !== "") {
      const searchLower = search.trim().toLowerCase();
      appointments = appointments.filter((item) => {
        const appointmentNumberMatch = item.appointment_number
          ?.toLowerCase()
          .includes(searchLower);
        const statusMatch = item.status?.toLowerCase().includes(searchLower);
        const typeMatch = item.type?.toLowerCase().includes(searchLower);
        const customerNameMatch = item.customer_id?.name
          ?.toLowerCase()
          .includes(searchLower);

        return (
          appointmentNumberMatch ||
          statusMatch ||
          typeMatch ||
          customerNameMatch
        );
      });
    }

    // ✅ Total count after search
    const totalCount = appointments.length;

    // ✅ Apply Pagination manually after filtering
    const skip = (Number(page) - 1) * Number(limit);
    const paginatedAppointments = appointments.slice(
      skip,
      skip + Number(limit)
    );

    // ✅ Attach OTPs
    const appointmentsWithOtp = await Promise.all(
      paginatedAppointments.map(async (order) => {
        const otp = await OtpModel.findOne({
          order_id: { $exists: true, $ne: null, $eq: order?.order_id?._id },
          otp_key: { $ne: "111111" },
        }).lean();
        return { ...order, otp: otp?.otp_key || null };
      })
    );

    // ✅ Transform response
    const transformedResults = appointmentsWithOtp.map((appointment) => {
      const {
        stylist_id: stylistData,
        customer_id: customerData,
        address_id: addressData,
        order_id: orderData,
        ...rest
      } = appointment;

      return {
        ...rest,
        stylist_data: stylistData,
        customer_data: customerData,
        address_data: addressData,
        order_data: orderData,
      };
    });

    return res.status(200).json({
      success: true,
      totalCount,
      page: Number(page),
      limit: Number(limit),
      data: transformedResults,
    });
  } catch (error) {
    console.error("Error fetching stylist appointments:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
});

exports.getUserLoginLocation = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    if (page && page <= 0) {
      return res.status(404).json({
        success: false,
        message: "Page number should be greater than or equal to 1",
      });
    }

    if (limit && limit <= 0) {
      return res.status(404).json({
        success: false,
        message: "limit number should be greater than or equal to 1",
      });
    }

    console.log({ page, limit });

    let skip = (page - 1) * limit;
    console.log({ skip });
    const [userLoginLocationData, countUserLoginAddress] = await Promise.all([
      userLoginAddress
        .find()
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .populate([{ path: "user", select: "firstName storeNumber email" }]),
      userLoginAddress.countDocuments(),
    ]);

    console.log({ countUserLoginAddress });

    let totalPages = Math.ceil(countUserLoginAddress / limit);

    return res.status(200).json({
      success: true,
      userLoginLocationData,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching stylist appointments:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.getOrderStylesAndMeasurements = async (req, res) => {
  try {
    const productId = req.params.id;

    const response = await axios.get(
      `https://app.lovoj.com:446/api/v1/product/${productId}`
    );

    const data = response.data;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching in product styles:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

exports.alterationProductData = async (req, res) => {
  try {
    const { productAlterationId, productId } = req.query;

    let productDoc = await ProductAlteration.findById(
      productAlterationId
    ).lean();
    console.log(productDoc);
    if (!productDoc) {
      return res.status(404).json({ message: "ProductAlteration not found" });
    }

    const specificProduct = productDoc.product.find(
      (p) => p._id.toString() === productId
    );

    if (!specificProduct) {
      return res
        .status(404)
        .json({ message: "Product not found in products array" });
    }

    let [measurements, special_instructions] = await Promise.all([
      MeasurementAlteration.findOne({
        "products.productId": productId,
      }).lean(),

      SpacialInstructionAltreation.findOne({
        "products.productId": productId,
      }).lean(),
    ]);

    const specificMeasurement =
      measurements?.products.find(
        (p) => p.productId.toString() === productId
      ) || null;

    const specificInstruction =
      special_instructions?.products.find(
        (p) => p.productId.toString() === productId
      ) || null;

    return res.status(200).json({
      success: true,
      product: specificProduct,
      measurement: specificMeasurement,
      specialInstruction: specificInstruction,
    });
  } catch (error) {
    console.error(" alterationProductData error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

/************************ update stylist appointment **************************/

exports.updateStylistAppointment = catchAsyncError(async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start_time, end_time, appointment_date } = req.body;

    // Check if appointment exists and is pending
    const appointment = await StylistAppointment.findOne({
      _id: id,
      status: "pending",
    });

    if (!appointment) {
      return res.status(400).json({
        success: false,
        message: "Appointment not found or status is not pending",
      });
    }

    console.log("Before update:", appointment);

    // Update allowed fields only
    if (start_time) appointment.start_time = start_time;
    if (end_time) appointment.end_time = end_time;
    if (appointment_date) appointment.appointment_date = appointment_date;

    await appointment.save();

    console.log("After update:", appointment);

    return res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      data: appointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
