const passport = require("passport");
const AppError = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const Otp = require("../models/otp");
const bcrypt = require("bcryptjs");
const Workers = require("../models/Worker.model");
const authKeys = require("../middleware/authKeys");
const Store = require("../models/stores");
const StoreLike = require("../models/storeLikes");
const { colorizeText } = require("../utils/others");
const axios = require("axios");
const UserLoginAddressSchema = require("../models/userLoginAddress");
const Token = require("../models/token.model");

/********************************* Main/Imp like api if any changes then reference this api *************************/
/*************************** testing/api for but now we use this *********************************/

exports.likeUnlikeStore = async (storeId, userId) => {
  const storeLike = await StoreLike.findOne({ storeId });

  if (!storeLike) {
    // If storeLike document not found, create a new one
    const user = await User.findById(userId);
    if (!user) {
      // Return an error or handle the case where the user does not exist
      throw new Error("User not found");
    }

    await StoreLike.create({
      storeId,
      totalLike: 1,
      userLikes: [
        {
          userId: user._id,
          name: user.name,
          email: user.email,
        },
      ],
    });

    // Increment totalLike in the Store document
    await Store.findByIdAndUpdate(storeId, { $inc: { totalLike: 1 } });

    return "Store Liked";
  } else {
    const isLiked = storeLike.userLikes.some((userLike) =>
      userLike.userId.equals(userId)
    );

    if (isLiked) {
      // If already liked, remove the user's details from userLikes array
      storeLike.userLikes = storeLike.userLikes.filter(
        (userLike) => !userLike.userId.equals(userId)
      );
      storeLike.totalLike -= 1;
      await storeLike.save();

      // Decrement totalLike in the Store document
      await Store.findByIdAndUpdate(storeId, { $inc: { totalLike: -1 } });

      // Remove user's details from Store document's userLikes array
      await Store.findByIdAndUpdate(storeId, {
        $pull: { userLikes: { userId: userId } },
      });

      return "Store Unliked";
    } else {
      // If not liked, add the userId to the userLikes array
      const user = await User.findById(userId);
      if (!user) {
        // Return an error or handle the case where the user does not exist
        throw new Error("User not found");
      }

      storeLike.userLikes.push({
        userId: user._id,
        name: user.name,
        email: user.email,
      });

      storeLike.totalLike += 1;
      await storeLike.save();

      // Increment totalLike in the Store document
      await Store.findByIdAndUpdate(storeId, { $inc: { totalLike: 1 } });

      // Add user's details to Store document's userLikes array
      await Store.findByIdAndUpdate(storeId, {
        $push: {
          userLikes: { userId: user._id, name: user.name, email: user.email },
        },
      });

      return "Store Liked";
    }
  }
};

/************** Solve superadmin and admin both login bug , but this time we not use this in future we use... ************/

// exports.authenticateUser = (req, res, next) => {
//   passport.authenticate("local", { session: false }, async (err, user, info) => {
//     try {
//       if (err) {
//         return next(err);
//       }
//       if (!user) {
//         return next(new AppError("invalid email or password.", 401));
//       }
//       const { email, password, storeNumber, role, storeType, deviceToken } = req.body;

//       if (role === "admin") {
//         const userFromDB = await User.findOne({ email });

//         if (!userFromDB || userFromDB.email !== email) {
//           return next(new AppError("Invalid email", 400));
//         }
//         if (userFromDB.role !== role&&userFromDB.role!=='superadmin') {
//           return next(new AppError("Invalid role", 400));
//         }
//         if (userFromDB.storeType !== storeType&&userFromDB.role!=='superadmin') {
//           return next(new AppError(`Login to the account with the correct storeType (${userFromDB.storeType}).`, 400));
//         }
//         const role1 = userFromDB?.role ? userFromDB.role : null
//         // Check activestatus
//         if (!userFromDB.activestatus) {
//           return next(new AppError("Your account was deactivated for some reason. Please contact the administrator...", 403));
//         }

//         const token = jwt.sign({ _id: user._id, role:role1 }, authKeys.jwtSecretKey, { expiresIn: a });

//         if (deviceToken) {
//           userFromDB.deviceToken = deviceToken;
//           await userFromDB.save();
//         }

//         console.log("User Email logged in : ", colorizeText(userFromDB.email, 'blue'));

//         return res.status(200).json({
//           success: true,
//           message: "Successfully logged in!",
//           token: token,
//           user: userFromDB,
//           deviceToken: deviceToken,
//         });
//       } else if (role === "superadmin") {
//         let query = {email}
//         if(storeType){
//           storeType
//         }
//         const userFromDB = await User.findOne({ email });
//         const role1 = userFromDB?.role ?userFromDB?.role  : null

//         if (!userFromDB || userFromDB.role !== "superadmin" || userFromDB.email !== email) {
//           return next(new AppError("Invalid credentials", 400));
//         }

//         const token = jwt.sign({ _id: user._id, role:role1 }, authKeys.jwtSecretKey,{ expiresIn: '15d' });

//         return res.status(200).json({
//           token: token,
//           message: "You are Signed in as SuperAdmin!",
//         });
//       } else {
//         const isWorkerRole = [
//           "manager",
//           "sales",
//           "cutter",
//           "mastertailor",
//           "stitching",
//           "accessories",
//           "QC",
//           "delivery",
//         ].includes(role);

//         if (isWorkerRole) {
//           // const workerFromDB = await Workers.findOne({ email });
//           const workerFromDB = await Workers.findOne({ email, storeNumber });

//           if (!workerFromDB) {
//             return next(new AppError("Invalid credentials", 400));
//           }
//           if (workerFromDB.email !== email) {
//             return next(new AppError("Invalid email", 400));
//           }
//           if (workerFromDB.storeNumber !== storeNumber) {
//             return next(new AppError("Invalid store number", 400));
//           }
//           if (workerFromDB.role !== role) {
//             return next(new AppError("Invalid store role", 400));
//           }
//           // Check activestatus
//           if (!workerFromDB.activestatus) {
//             return next(new AppError("Your account was deactivated for some reason. Please contact the administrator...", 403));
//           }
//           const role1 = workerFromDB?.role ? workerFromDB?.role : null
//           const workerToken = jwt.sign({ _id: workerFromDB._id, role:role1 }, authKeys.jwtSecretKey, { expiresIn: '15d' });

//           if (deviceToken) {
//             workerFromDB.deviceToken = deviceToken;
//             await workerFromDB.save();
//           }

//           return res.status(200).json({
//             success: true,
//             message: "Successfully logged in!",
//             token: workerToken,
//             worker: workerFromDB,
//             deviceToken: deviceToken,
//           });
//         }
//       }
//     } catch (error) {
//       console.log(error);
//       return next(new AppError("Server error", 500));
//     }
//   })(req, res, next);
// };

exports.authenticateUser = (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err, user, info) => {
      try {
        console.log({ err, info });
        if (err) return next(err);
        console.log(user, "user............");
        if (!user) return next(new AppError(info.message, 401));

        const {
          email,
          password,
          storeNumber,
          role,
          storeType,
          deviceToken,
          deviceId,
          deviceType,
          lat,
          long,
        } = req.body;

        // ADMIN LOGIN
        if (role === "admin") {
          const userFromDB = await User.findOne(
            { email },
            { currentLocation: 0 }
          );
          if (!userFromDB || userFromDB.email !== email) {
            return next(new AppError("Invalid email", 400));
          }

          if (userFromDB.role !== role && userFromDB.role !== "superadmin") {
            return next(new AppError("Invalid role", 400));
          }

          if (
            userFromDB.storeType !== storeType &&
            userFromDB.role !== "superadmin"
          ) {
            return next(
              new AppError(
                `Login with the correct storeType (${userFromDB.storeType}).`,
                400
              )
            );
          }

          if (!userFromDB.activestatus) {
            return next(
              new AppError(
                "Your account is deactivated. Please contact admin.",
                403
              )
            );
          }
          console.log(userFromDB, "userFromDB");
          const role1 = userFromDB?.role || null;
          const token = jwt.sign(
            { _id: user._id, role: role1 },
            authKeys.jwtSecretKey,
            { expiresIn: "15d" }
          );

          if (deviceToken) {
            userFromDB.deviceToken = deviceToken;
            await userFromDB.save();
          }

          const tokenData = await Token.create({
            role,
            userId: userFromDB._id,
            token,
            device: { token: deviceToken, type: deviceType, id: deviceId },
          });

          console.log(tokenData, "tokenData.....");
          const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress;

          const response = await axios.get(`http://ip-api.com/json/${ip}`);
          const locationData = response.data;

          const userAddressData = await UserLoginAddressSchema.create({
            user: userFromDB._id,
            ip: ip ? ip : " ",
            country: locationData.country ? locationData.country : " ",
            countryCode: locationData.countryCode
              ? locationData.countryCode
              : " ",
            region: locationData.region ? locationData.region : " ",
            regionName: locationData.regionName ? locationData.regionName : " ",
            city: locationData.city ? locationData.city : " ",
            location: { coordinates: [long, lat] },
            // zip: locationData.zip ? locationData.zip : " ",
            // lat: locationData.lat ? locationData.lat : 0,
            // lon: locationData.lon ? locationData.lon : 0,
            timezone: locationData.timezone ? locationData.timezone : " ",
            isp: locationData.isp ? locationData.isp : " ",
            org: locationData.org ? locationData.org : " ",
            as: locationData.as ? locationData.as : " ",
            query: locationData.query ? locationData.query : " ",
          });
          return res.status(200).json({
            success: true,
            message: "Successfully logged in!",
            token: token,
            user: userFromDB,
            deviceToken: deviceToken,
          });
        }

        // // SUPERADMIN LOGIN
        // else if (role === "superadmin") {
        //   const userFromDB = await User.findOne({ email });

        //   if (
        //     !userFromDB ||
        //     userFromDB.role !== "superadmin" ||
        //     userFromDB.email !== email
        //   ) {
        //     return next(new AppError("Invalid credentials", 400));
        //   }

        //   const role1 = userFromDB?.role || null;
        //   const token = jwt.sign(
        //     { _id: user._id, role: role1 },
        //     authKeys.jwtSecretKey,
        //     { expiresIn: "30d" }
        //   );

        //   return res.status(200).json({
        //     token: token,
        //     message: "You are Signed in as SuperAdmin!",
        //   });
        // }
        // SUPERADMIN LOGIN
        else if (role === "superadmin") {
          const userFromDB = await User.findOne({ email });
          if (
            !userFromDB ||
            userFromDB.role !== "superadmin" ||
            userFromDB.email !== email
          ) {
            return next(new AppError("Invalid credentials", 400));
          }

          const role1 = userFromDB?.role || null;
          const token = jwt.sign(
            { _id: userFromDB._id, role: role1 },
            authKeys.jwtSecretKey,
            { expiresIn: "30d" }
          );

          return res.status(200).json({
            token: token,
            message: "You are Signed in as SuperAdmin!",
            // role: role1,
            data: userFromDB, // full user data returned
          });
        }

        // WORKER LOGIN
        else {
          const isWorkerRole = [
            "manager",
            "sales",
            "cutter",
            "mastertailor",
            "stitching",
            "accessories",
            "QC",
            "delivery",
            "helper",
            "embroidery",
            "trims",
          ].includes(role);
          console.log(isWorkerRole, "isWorkrole...................");
          if (isWorkerRole) {
            // Step 1: Find all workers by email
            const workers = await Workers.find({ email });

            console.log({ workers });

            if (!workers || workers.length === 0) {
              return next(new AppError("Invalid email", 400));
            }

            // Step 2: Find matching worker with correct storeNumber
            const workerFromDB = workers.find(
              (w) => w.storeNumber === storeNumber
            );

            if (!workerFromDB) {
              return next(
                new AppError(
                  "This email exists, but not for this store number.",
                  400
                )
              );
            }

            if (workerFromDB.role !== role) {
              return next(new AppError("Invalid store role", 400));
            }

            if (!workerFromDB.activestatus) {
              return next(
                new AppError(
                  "Your account is deactivated. Please contact admin.",
                  403
                )
              );
            }

            const role1 = workerFromDB?.role || null;
            const workerToken = jwt.sign(
              { _id: workerFromDB._id, role: role1 },
              authKeys.jwtSecretKey,
              { expiresIn: "15d" }
            );

            if (deviceToken) {
              workerFromDB.deviceToken = deviceToken;
              await workerFromDB.save();
            }

            return res.status(200).json({
              success: true,
              message: "Successfully logged in!",
              token: workerToken,
              worker: workerFromDB,
              deviceToken: deviceToken,
            });
          }
        }
      } catch (error) {
        console.error(error);
        return next(new AppError("Server error", 500));
      }
    }
  )(req, res, next);
};

/*************************Now main 3 main********************* */

// exports.authenticateUserWithOtp = async (req, res, next) => {
//   const { mobileNumber, email, otp_key } = req.body;

//   // Check if either email or mobile number is provided
//   if (!email && !mobileNumber) {
//     return next(new AppError("Email or mobile number is required.", 400));
//   }

//   try {
//     let user;

//     // Check if user exists by email or mobile number
//     if (email) {
//       user = await User.findOne({ email,activestatus:true });
//     }

//     // If user is not found, return an error
//     if (!user) {
//       return next(new AppError("User not found. Please sign up first.", 404));
//     }
//     const role = user.role?user.role:null

//     // Check if OTP key is provided
//     if (!otp_key) {
//       return next(new AppError("OTP is required for verification.", 400));
//     }

//     let otp;

//     if (email) {
//       // Find the latest unused OTP for the provided email
//       otp = await Otp.findOne({ email, used: false }).sort({ createdAt: -1 });
//     } else {
//       // Find the latest unused OTP for the provided mobile number
//       otp = await Otp.findOne({ mobileNumber, used: false }).sort({ createdAt: -1 });
//     }

//     // If no unused OTP found, return error
//     if (!otp) {
//       return next(new AppError("OTP not found or already used.", 404));
//     }

//     // Check if OTP is expired
//     const otpCreated = new Date(otp.created).getTime();
//     if (Date.now() - otpCreated > 2400000) { // 24 minutes expiration time
//       return next(new AppError("Sign Up time expired.", 403));
//     }

//     // Check if OTP key is a string
//     if (typeof otp_key !== 'string') {
//       return next(new AppError("Invalid OTP format.", 400));
//     }

//     // Compare provided OTP with the OTP from the database
//     if (!bcrypt.compareSync(otp_key, otp.otp_key)) {
//       return next(new AppError("Wrong OTP.", 403));
//     }

//     // Mark OTP as used
//     otp.used = true;
//     await otp.save();

//     // Generate JWT token
//     const token = jwt.sign({ _id: user._id,role}, authKeys.jwtSecretKey, { expiresIn: "15d" });

//     // Send success response with token and user information
//     res.status(200).json({
//       success: true,
//       message: "Successfully logged in!",
//       token,
//       user,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

exports.authenticateUserWithOtp = async (req, res, next) => {
  const {
    mobileNumber,
    email,
    otp_key,
    storeType,
    lat = 0,
    long = 0,
  } = req.body;

  if (!email && !mobileNumber) {
    return next(new AppError("Email or mobile number is required.", 400));
  }

  if (!storeType) {
    return next(new AppError("Store type is required.", 400));
  }

  try {
    let matchedUsers = [];

    if (email) {
      const emailUsers = await User.find({ email });
      if (emailUsers.length === 0) {
        return next(new AppError("No user found with this email.", 404));
      }

      const activeUserWithStoreType = emailUsers.find(
        (u) => u.storeType === storeType && u.activestatus === true
      );

      if (!activeUserWithStoreType) {
        const storeTypes = emailUsers.map((u) => u.storeType).join(", ");
        return next(
          new AppError(
            `Email exists but not with active status for store type '${storeType}'. Available store types: ${storeTypes}`,
            400
          )
        );
      }

      matchedUsers.push(activeUserWithStoreType);
    }

    if (mobileNumber) {
      const mobileUsers = await User.find({ mobileNumber });
      if (mobileUsers.length === 0) {
        return next(
          new AppError("No user found with this mobile number.", 404)
        );
      }

      const activeUserWithStoreType = mobileUsers.find(
        (u) => u.storeType === storeType && u.activestatus === true
      );

      if (!activeUserWithStoreType) {
        const storeTypes = mobileUsers.map((u) => u.storeType).join(", ");
        return next(
          new AppError(
            `Mobile number exists but not with active status for store type '${storeType}'. Available store types: ${storeTypes}`,
            400
          )
        );
      }

      matchedUsers.push(activeUserWithStoreType);
    }

    // Get the final matched user
    const user = matchedUsers[0];

    // OTP validation
    if (!otp_key) {
      return next(new AppError("OTP is required for verification.", 400));
    }

    let otp;
    if (email) {
      otp = await Otp.findOne({ email, used: false }).sort({ createdAt: -1 });
    } else {
      otp = await Otp.findOne({ mobileNumber, used: false }).sort({
        createdAt: -1,
      });
    }

    if (!otp) {
      return next(new AppError("OTP not found or already used.", 404));
    }

    const otpCreated = new Date(otp.created).getTime();
    if (Date.now() - otpCreated > 24 * 60 * 1000) {
      return next(new AppError("OTP has expired.", 403));
    }

    if (typeof otp_key !== "string") {
      return next(new AppError("Invalid OTP format.", 400));
    }

    const isOtpValid = bcrypt.compareSync(otp_key, otp.otp_key);
    if (!isOtpValid) {
      return next(new AppError("Incorrect OTP.", 403));
    }

    // Mark OTP as used
    otp.used = true;
    await otp.save();

    // Generate token

    const token = jwt.sign(
      { _id: user._id, storeType },
      authKeys.jwtSecretKey,
      {
        expiresIn: "15d",
      }
    );
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    const locationData = response.data;

    const userAddressData = await UserLoginAddressSchema.create({
      user: user._id,
      ip: ip ? ip : " ",
      country: locationData.country ? locationData.country : " ",
      countryCode: locationData.countryCode ? locationData.countryCode : " ",
      region: locationData.region ? locationData.region : " ",
      regionName: locationData.regionName ? locationData.regionName : " ",
      city: locationData.city ? locationData.city : " ",
      location: { coordinates: [long, lat] },
      // zip: locationData.zip ? locationData.zip : " ",
      // lat: locationData.lat ? locationData.lat : 0,
      // lon: locationData.lon ? locationData.lon : 0,
      timezone: locationData.timezone ? locationData.timezone : " ",
      isp: locationData.isp ? locationData.isp : " ",
      org: locationData.org ? locationData.org : " ",
      as: locationData.as ? locationData.as : " ",
      query: locationData.query ? locationData.query : " ",
    });
    // Response
    res.status(200).json({
      success: true,
      message: "Successfully logged in!",
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// exports.commonAuthenticateUser = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;
//     const userFromDB = await User.findOne({ email }).select("+password");
//     console.log(userFromDB);
//     if (!userFromDB) {
//       return next(new AppError("Invalid email or password.", 401));
//     }

//     console.log({ userFromDB, password });

//     const matchedPassword = await bcrypt.compare(password, userFromDB.password);

//     console.log(matchedPassword, "njndjwenjwfuinhuirnhgur");

//     if (!matchedPassword) {
//       return next(new AppError("Invalid email or password.", 401));
//     }

//     const role = userFromDB.role;

//     if (role === "stylish") {
//       const token = jwt.sign(
//         { _id: userFromDB._id, role },
//         authKeys.jwtSecretKey,
//         { expiresIn: "15d" }
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Successfully logged in!",
//         token,
//         user: userFromDB,
//       });
//     } else {
//       return next(new AppError("Role is not defined!", 401));
//     }
//   } catch (error) {
//     console.error(error);
//     return next(new AppError("Server error", 500));
//   }
// };

exports.commonAuthenticateUser = (req, res, next) => {
  passport.authenticate(
    "local",
    { session: false },
    async (err, user, info) => {
      try {
        if (err) {
          return next(err);
        }

        const { email, password } = req.body;

        const userFromDB = await User.findOne({ email }).select("+password");

        if (!userFromDB) {
          return next(new AppError("Invalid email or password.", 401));
        }

        const matchedPassword = await bcrypt.compare(
          password,
          userFromDB.password
        );

        if (!matchedPassword) {
          return next(new AppError("Invalid password.", 401));
        }

        const role = userFromDB.role;

        if (role === "stylish") {
          const token = jwt.sign(
            { _id: userFromDB._id, role },
            authKeys.jwtSecretKey,
            { expiresIn: "15d" }
          );

          console.log(req.ip, "ip address.......................");
          const ip =
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress;

          const response = await axios.get(`http://ip-api.com/json/${ip}`);
          const locationData = response.data;

          const userAddressData = await UserLoginAddressSchema.findOneAndUpdate(
            {
              user: userFromDB._id,
              zip: locationData.zip,
            },
            {
              ip: ip ? ip : " ",
              country: locationData.country ? locationData.country : " ",
              countryCode: locationData.countryCode
                ? locationData.countryCode
                : " ",
              region: locationData.region ? locationData.region : " ",
              regionName: locationData.regionName
                ? locationData.regionName
                : " ",
              city: locationData.city ? locationData.city : " ",
              zip: locationData.zip ? locationData.zip : " ",
              lat: locationData.lat ? locationData.lat : 0,
              lon: locationData.lon ? locationData.lon : 0,
              timezone: locationData.timezone ? locationData.timezone : " ",
              isp: locationData.isp ? locationData.isp : " ",
              org: locationData.org ? locationData.org : " ",
              as: locationData.as ? locationData.as : " ",
              query: locationData.query ? locationData.query : " ",
            },
            {
              upsert: true,
              new: true,
            }
          );

          console.log({ userAddressData });

          return res.status(200).json({
            success: true,
            message: "Successfully logged in!",
            token,
            user: userFromDB,
          });
        } else {
          return next(new AppError("Role is not defined!", 401));
        }
      } catch (error) {
        console.error(error);
        return next(new AppError("Server error", 500));
      }
    }
  )(req, res, next);
};
