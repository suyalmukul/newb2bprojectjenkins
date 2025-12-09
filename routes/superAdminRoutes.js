const express = require("express");
const superAdminRouter = express.Router();
const {
  jwtAuth,
  authorizeAdmin,
  jwtAuthAdmin,
  jwtAuthSuperAdmin,
} = require("../middleware/jwtAuth");
const {
  getStoreState,
  verifyStore,
  storeProfileData,
  toggleActiveStatus,
  toggleSuperAdminPermission,
  toggleSuperAdminPermissionForStylish,
  superadminGetAllEntities,
  getOrderListingSuperadmin,
  getQuickOrdersOnline,
  createCounpons,
  getCouponForBoth,
  getCounponsOnline,
  getCounponsOffline,
  changeStorePasswordBySuperAdmin,
  OnlineOfflineCustomersListing,
  deleteLoginMembers,
  createAsset,
  getAssets,
  createOrUpdateShipping,
  getShippingAndPricingDetails,
  getCustomDesigns,
  createAssetNew,
  getAssetsNew,
  getCustomStyles,

  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,

  getStylistAppointments,
  getUserLoginLocation,
  getOrderStylesAndMeasurements,
  alterationProductData,
  updateStylistAppointment,
} = require("../controllers/superAdminController");

// //**********************Super admin Sign up *********************************/

superAdminRouter.get("/stores", jwtAuth, authorizeAdmin, getStoreState);
superAdminRouter.put("/stores/:id", jwtAuth, authorizeAdmin, verifyStore);

superAdminRouter.get(
  "/stores/storeProfileData/:id",
  jwtAuth,
  authorizeAdmin,
  storeProfileData
);

//superadminGetAllEntities
superAdminRouter.get(
  "/stores/find-user-worker/:type",
  jwtAuthSuperAdmin,
  superadminGetAllEntities
);
superAdminRouter.post(
  "/stores/activestatus",
  jwtAuthSuperAdmin,
  toggleActiveStatus
);
//deleteLoginMembers
superAdminRouter.delete(
  "/stores/deleteMembers",
  jwtAuthSuperAdmin,
  deleteLoginMembers
);

superAdminRouter.put(
  "/stores/togglePermission/:id",
  jwtAuthSuperAdmin,
  toggleSuperAdminPermission
);
//
superAdminRouter.put(
  "/stores/togglePermissionForStylish/:id",
  jwtAuthSuperAdmin,
  toggleSuperAdminPermissionForStylish
);

superAdminRouter.get(
  "/stores/orderlistngs/:storeId",
  jwtAuthSuperAdmin,
  getOrderListingSuperadmin
);

/*************Get All QuickOrders Order List **************/
superAdminRouter.get("/stores/quickorders", getQuickOrdersOnline);

/********************************** Coupan ******************************/
superAdminRouter.post(
  "/stores/createCouponForAll",
  jwtAuthSuperAdmin,
  createCounpons
);
superAdminRouter.post("/stores/createOwnCoupon", jwtAuthAdmin, createCounpons);

superAdminRouter.get(
  "/stores/getAllCouponsForSuperadmin",
  jwtAuthSuperAdmin,
  getCouponForBoth
);
superAdminRouter.get(
  "/stores/getOwnCouponsForAdmin",
  jwtAuthAdmin,
  getCouponForBoth
);

superAdminRouter.get(
  "/stores/getCouponOffline/:_id",
  jwtAuthAdmin,
  getCounponsOffline
);
superAdminRouter.get(
  "/stores/getCouponOnline",
  jwtAuthAdmin,
  getCounponsOnline
);

superAdminRouter.get(
  "/stores/getCouponOfflineSuperadmin",
  jwtAuthSuperAdmin,
  getCounponsOffline
);
superAdminRouter.get(
  "/stores/getCouponOnlineSuperadmin",
  jwtAuthSuperAdmin,
  getCounponsOnline
);

superAdminRouter.post(
  "/stores/changeStorePasswordBySuperAdmin",
  jwtAuthSuperAdmin,
  changeStorePasswordBySuperAdmin
);

superAdminRouter.get(
  "/stores/getOnlineOfflineCustomersSuperadmin",
  jwtAuthSuperAdmin,
  OnlineOfflineCustomersListing
);

/******* Assets *********/
superAdminRouter.post("/assets", jwtAuthSuperAdmin, createAsset);
superAdminRouter.post("/assets-new", jwtAuthSuperAdmin, createAssetNew);
superAdminRouter.post(
  "/pricing-shipping/:product_category",
  jwtAuthSuperAdmin,
  createOrUpdateShipping
);
superAdminRouter.get(
  "/pricing-shipping/:product_category",
  getShippingAndPricingDetails
);
superAdminRouter.get("/assets", jwtAuthSuperAdmin, getAssets);
superAdminRouter.get("/assets-new", jwtAuthSuperAdmin, getAssetsNew);
superAdminRouter.get("/customDesign", jwtAuthSuperAdmin, getCustomDesigns);
superAdminRouter.get("/custom-styles", jwtAuthSuperAdmin, getCustomStyles);

/************************ product dropdownssss ***********************/

superAdminRouter.post("/add_dropdowns", jwtAuthSuperAdmin, createProduct);
superAdminRouter.get("/get_dropdowns", jwtAuthSuperAdmin, getAllProducts);
superAdminRouter.put("/update_dropdowns/:id", jwtAuthSuperAdmin, updateProduct);
superAdminRouter.delete(
  "/delete_dropdowns/:id",
  jwtAuthSuperAdmin,
  deleteProduct
);

superAdminRouter.get(
  "/appointments-list",
  // jwtAuthSuperAdmin,
  getStylistAppointments
);

superAdminRouter.put(
  "/appointments-update/:id",
  // jwtAuthSuperAdmin,
  updateStylistAppointment
);

superAdminRouter.get(
  "/userLoginLocation",
  // jwtAuthSuperAdmin,
  getUserLoginLocation
);

superAdminRouter.get(
  "/orderStyles/:id",
  jwtAuthSuperAdmin,
  getOrderStylesAndMeasurements
);

superAdminRouter.get(
  "/alterationProduct",
  // jwtAuthSuperAdmin,
  alterationProductData
);

module.exports = superAdminRouter;
