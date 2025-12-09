const PurchasedCategory = require("../models/PurchasedCategory");

exports.updateMostPurchasedCategories = async (categoryData) => {
    // Step 1: Group data by store_id + category_id
    const grouped = {};

    for (const item of categoryData) {
        const key = `${item.store_id}_${item.category_name}_${item.type}`;
        if (!grouped[key]) {
            grouped[key] = {
                store_id: item.store_id,
                category_name: item.category_name,
                type:item.type,
                quantity: 0,
            };
        }
        grouped[key].quantity += item.quantity;
    }

    // Step 2: Prepare all DB operations
    const updateOperations = Object.values(grouped).map(({ store_id, category_name, quantity,type }) => {
        return PurchasedCategory.findOneAndUpdate(
            { store_id,category_name,type },
            {
                $setOnInsert: {
                    store_id,
                    category_name,
                    type

                },
                $inc: { count: quantity },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    });

    // Step 3: Execute all updates in parallel
    await Promise.all(updateOperations);
};
