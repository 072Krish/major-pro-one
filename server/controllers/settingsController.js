const User = require("../models/User");

const DEFAULT_SETTINGS = {
    notifications: {
        appNotifications: true,
        budgetAlerts: true,
        goalReminders: true,
    },

    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-hour",
};


// ==========================================
// GET CURRENT USER SETTINGS
// ==========================================

const getSettings = async (req, res) => {
    try {
        const user = await User.findById(
            req.user._id
        ).select(
            "name email phone profileImage settings"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const storedSettings =
            user.settings?.toObject?.() ||
            user.settings ||
            {};

        const settings = {
            notifications: {
                appNotifications:
                    storedSettings.notifications
                        ?.appNotifications ??
                    DEFAULT_SETTINGS.notifications
                        .appNotifications,

                budgetAlerts:
                    storedSettings.notifications
                        ?.budgetAlerts ??
                    DEFAULT_SETTINGS.notifications
                        .budgetAlerts,

                goalReminders:
                    storedSettings.notifications
                        ?.goalReminders ??
                    DEFAULT_SETTINGS.notifications
                        .goalReminders,
            },

            dateFormat:
                storedSettings.dateFormat ||
                DEFAULT_SETTINGS.dateFormat,

            timeFormat:
                storedSettings.timeFormat ||
                DEFAULT_SETTINGS.timeFormat,
        };

        return res.status(200).json({
            success: true,

            profile: {
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                avatar: user.profileImage || "",
            },

            settings,
        });

    } catch (error) {
        console.error(
            "Get Settings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to fetch settings",
        });
    }
};


// ==========================================
// UPDATE CURRENT USER SETTINGS
// ==========================================

const updateSettings = async (req, res) => {
    try {
        const {
            notifications,
            dateFormat,
            timeFormat,
        } = req.body;

        const allowedDateFormats = [
            "DD/MM/YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
        ];

        const allowedTimeFormats = [
            "12-hour",
            "24-hour",
        ];

        if (
            dateFormat !== undefined &&
            !allowedDateFormats.includes(dateFormat)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid date format",
            });
        }

        if (
            timeFormat !== undefined &&
            !allowedTimeFormats.includes(timeFormat)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid time format",
            });
        }

        if (
            notifications !== undefined &&
            (
                typeof notifications !== "object" ||
                notifications === null ||
                Array.isArray(notifications)
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Notifications must be an object",
            });
        }

        const updateData = {};

        if (
            notifications?.appNotifications !==
            undefined
        ) {
            updateData[
                "settings.notifications.appNotifications"
            ] = Boolean(
                notifications.appNotifications
            );
        }

        if (
            notifications?.budgetAlerts !==
            undefined
        ) {
            updateData[
                "settings.notifications.budgetAlerts"
            ] = Boolean(
                notifications.budgetAlerts
            );
        }

        if (
            notifications?.goalReminders !==
            undefined
        ) {
            updateData[
                "settings.notifications.goalReminders"
            ] = Boolean(
                notifications.goalReminders
            );
        }

        if (dateFormat !== undefined) {
            updateData["settings.dateFormat"] =
                dateFormat;
        }

        if (timeFormat !== undefined) {
            updateData["settings.timeFormat"] =
                timeFormat;
        }

        if (
            Object.keys(updateData).length === 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "No valid settings provided",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: updateData,
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("settings");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Settings updated successfully",
            settings: user.settings,
        });

    } catch (error) {
        console.error(
            "Update Settings Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update settings",
        });
    }
};

// ==========================================
// UPDATE CURRENT USER PROFILE
// ==========================================

const updateProfile = async (req, res) => {
    try {
        const { name, phone } = req.body;

        const trimmedName = String(name || "").trim();
        const trimmedPhone = String(phone || "").trim();

        if (!trimmedName) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        if (
            trimmedPhone &&
            !/^\+?[0-9]{10,15}$/.test(trimmedPhone)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid phone number",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    name: trimmedName,
                    phone: trimmedPhone,
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                profileImage: user.profileImage,
            },
        });

    } catch (error) {
        console.error(
            "Update Profile Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to update profile",
        });
    }
};

// ==========================================
// CHANGE CURRENT USER PASSWORD
// ==========================================

const changePassword = async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword,
        } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password and new password are required",
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must contain at least 8 characters",
            });
        }

        if (
            !/[A-Z]/.test(newPassword) ||
            !/[0-9]/.test(newPassword)
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must contain at least one uppercase letter and one number",
            });
        }

        const user = await User.findById(
            req.user._id
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const bcrypt = require("bcryptjs");

        const isCurrentPasswordCorrect =
            await bcrypt.compare(
                currentPassword,
                user.password
            );

        if (!isCurrentPasswordCorrect) {
            return res.status(400).json({
                success: false,
                message:
                    "Current password is incorrect",
            });
        }

        const isSamePassword =
            await bcrypt.compare(
                newPassword,
                user.password
            );

        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must be different from current password",
            });
        }

        const salt = await bcrypt.genSalt(10);

        user.password = await bcrypt.hash(
            newPassword,
            salt
        );

        await user.save();

        return res.status(200).json({
            success: true,
            message:
                "Password changed successfully",
        });

    } catch (error) {
        console.error(
            "Change Password Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to change password",
        });
    }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
    getSettings,
    updateSettings,
    updateProfile,
    changePassword,
};