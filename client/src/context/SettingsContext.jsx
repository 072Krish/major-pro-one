import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getSettingsAPI,
    updateSettingsAPI,
    updateProfileAPI,
    changePasswordAPI,
} from "../services/settingsService";

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
    theme: "dark",

    language: "English",

    dateFormat: "DD/MM/YYYY",

    timeFormat: "12",

    notifications: true,

    budgetAlerts: true,

    goalReminders: true,

    twoFactorEnabled: false,

    profile: {
        name: "",
        email: "",
        phone: "",
        avatar: "",
    },
};

const STORAGE_KEY = "finwise_app_settings";

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(() => {
        try {
            const storedSettings =
                JSON.parse(
                    localStorage.getItem(STORAGE_KEY)
                ) || {};

            const loggedInUser =
                JSON.parse(
                    localStorage.getItem("user")
                ) || {};

            return {
                ...DEFAULT_SETTINGS,
                ...storedSettings,

                profile: {
                    ...DEFAULT_SETTINGS.profile,

                    // Current logged-in user ko
                    // old cached user se priority milegi.
                    name:
                        loggedInUser.name ||
                        "FinWise User",

                    email:
                        loggedInUser.email ||
                        "",

                    phone:
                        loggedInUser.phone ||
                        "",

                    avatar:
                        loggedInUser.profileImage ||
                        "",
                },
            };
        } catch (error) {
            console.error(
                "Settings initialization error:",
                error
            );

            return DEFAULT_SETTINGS;
        }
    });

    const [settingsLoading, setSettingsLoading] =
        useState(false);


    // ==========================================
    // LOAD CURRENT USER DATA FROM MONGODB
    // ==========================================

    useEffect(() => {
        const fetchMongoSettings = async () => {
            const token =
                localStorage.getItem("token");

            if (!token) {
                return;
            }

            try {
                setSettingsLoading(true);

                const response =
                    await getSettingsAPI();

                const mongoSettings =
                    response.settings || {};

                const mongoProfile =
                    response.profile || {};

                setSettings((previousSettings) => ({
                    ...previousSettings,

                    profile: {
                        ...previousSettings.profile,

                        name:
                            mongoProfile.name ||
                            previousSettings.profile.name ||
                            "FinWise User",

                        email:
                            mongoProfile.email ||
                            previousSettings.profile.email ||
                            "",

                        phone:
                            mongoProfile.phone ||
                            "",

                        avatar:
                            mongoProfile.avatar ||
                            previousSettings.profile.avatar ||
                            "",
                    },

                    notifications:
                        mongoSettings.notifications
                            ?.appNotifications ??
                        previousSettings.notifications,

                    budgetAlerts:
                        mongoSettings.notifications
                            ?.budgetAlerts ??
                        previousSettings.budgetAlerts,

                    goalReminders:
                        mongoSettings.notifications
                            ?.goalReminders ??
                        previousSettings.goalReminders,

                    dateFormat:
                        mongoSettings.dateFormat ||
                        previousSettings.dateFormat,

                    timeFormat:
                        mongoSettings.timeFormat ===
                        "24-hour"
                            ? "24"
                            : "12",
                }));

                // Current MongoDB profile ko
                // user localStorage mein bhi sync karo.
                if (
                    mongoProfile.name ||
                    mongoProfile.email
                ) {
                    const currentUser =
                        JSON.parse(
                            localStorage.getItem("user")
                        ) || {};

                    localStorage.setItem(
                        "user",
                        JSON.stringify({
                            ...currentUser,

                            name:
                                mongoProfile.name ||
                                currentUser.name,

                            email:
                                mongoProfile.email ||
                                currentUser.email,

                            phone:
                                mongoProfile.phone ||
                                "",

                            profileImage:
                                mongoProfile.avatar ||
                                currentUser.profileImage ||
                                "",
                        })
                    );
                }

            } catch (error) {
                console.error(
                    "Settings Load Error:",
                    error.response?.data?.message ||
                    error.message
                );

            } finally {
                setSettingsLoading(false);
            }
        };

        fetchMongoSettings();
    }, []);


    // ==========================================
    // LOCAL CACHE
    // ==========================================

    useEffect(() => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(settings)
        );
    }, [settings]);


    // ==========================================
    // THEME
    // ==========================================

    useEffect(() => {
        document.documentElement.setAttribute(
            "data-theme",
            settings.theme
        );

        document.body.classList.remove(
            "light-mode",
            "dark-mode"
        );

        document.body.classList.add(
            settings.theme === "light"
                ? "light-mode"
                : "dark-mode"
        );

    }, [settings.theme]);


    // ==========================================
    // UPDATE SETTINGS
    // ==========================================

    const updateSettings = async (updates) => {
        const shouldUpdateMongo =
            updates.notifications !== undefined ||
            updates.budgetAlerts !== undefined ||
            updates.goalReminders !== undefined ||
            updates.dateFormat !== undefined ||
            updates.timeFormat !== undefined;

        if (shouldUpdateMongo) {
            const nextSettings = {
                ...settings,
                ...updates,
            };

            const mongoPayload = {
                notifications: {
                    appNotifications:
                        Boolean(
                            nextSettings.notifications
                        ),

                    budgetAlerts:
                        Boolean(
                            nextSettings.budgetAlerts
                        ),

                    goalReminders:
                        Boolean(
                            nextSettings.goalReminders
                        ),
                },

                dateFormat:
                    nextSettings.dateFormat,

                timeFormat:
                    nextSettings.timeFormat === "24"
                        ? "24-hour"
                        : "12-hour",
            };

            const response =
                await updateSettingsAPI(
                    mongoPayload
                );

            const savedSettings =
                response.settings || {};

            setSettings((previousSettings) => ({
                ...previousSettings,
                ...updates,

                notifications:
                    savedSettings.notifications
                        ?.appNotifications ??
                    nextSettings.notifications,

                budgetAlerts:
                    savedSettings.notifications
                        ?.budgetAlerts ??
                    nextSettings.budgetAlerts,

                goalReminders:
                    savedSettings.notifications
                        ?.goalReminders ??
                    nextSettings.goalReminders,

                dateFormat:
                    savedSettings.dateFormat ||
                    nextSettings.dateFormat,

                timeFormat:
                    savedSettings.timeFormat ===
                    "24-hour"
                        ? "24"
                        : "12",
            }));

            return response;
        }

        // Theme aur 2FA local/UI-only hain.
        setSettings((previousSettings) => ({
            ...previousSettings,
            ...updates,
        }));

        return {
            success: true,
        };
    };


    // ==========================================
    // UPDATE PROFILE
    // ==========================================

    const updateProfile = async (
        profileUpdates
    ) => {
        const response =
            await updateProfileAPI(
                profileUpdates
            );

        const updatedUser =
            response.user || {};

        setSettings((previousSettings) => ({
            ...previousSettings,

            profile: {
                ...previousSettings.profile,

                name:
                    updatedUser.name ||
                    previousSettings.profile.name,

                email:
                    updatedUser.email ||
                    previousSettings.profile.email,

                phone:
                    updatedUser.phone ||
                    "",

                avatar:
                    updatedUser.profileImage ||
                    previousSettings.profile.avatar,
            },
        }));

        const currentUser =
            JSON.parse(
                localStorage.getItem("user")
            ) || {};

        localStorage.setItem(
            "user",
            JSON.stringify({
                ...currentUser,
                ...updatedUser,

                name:
                    updatedUser.name ||
                    currentUser.name,

                email:
                    updatedUser.email ||
                    currentUser.email,

                phone:
                    updatedUser.phone ||
                    "",

                profileImage:
                    updatedUser.profileImage ||
                    currentUser.profileImage ||
                    "",
            })
        );

        return response;
    };

    const syncLoggedInUser = (userData) => {
    if (!userData) return;

    setSettings((previousSettings) => ({
        ...previousSettings,

        profile: {
            ...previousSettings.profile,

            name:
                userData.name ||
                previousSettings.profile.name ||
                "",

            email:
                userData.email ||
                previousSettings.profile.email ||
                "",

            phone:
                userData.phone ||
                previousSettings.profile.phone ||
                "",

            avatar:
                userData.profileImage ||
                previousSettings.profile.avatar ||
                "",
        },
    }));
};


    // ==========================================
    // CHANGE PASSWORD
    // ==========================================

    const changePassword = async (
        passwordData
    ) => {
        return await changePasswordAPI(
            passwordData
        );
    };


    // ==========================================
    // CONTEXT VALUE
    // ==========================================

const value = useMemo(
    () => ({
        settings,
        settingsLoading,
        updateSettings,
        updateProfile,
        changePassword,
        syncLoggedInUser,
    }),
    [
        settings,
        settingsLoading,
    ]
);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}


export function useSettings() {
    const context =
        useContext(SettingsContext);

    if (!context) {
        throw new Error(
            "useSettings must be used inside SettingsProvider"
        );
    }

    return context;
}