import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { logout } from "../../utils/auth";
import useAutoLogout from "../../hooks/useAutoLogout";

import { getTransactionsAPI, addTransactionAPI, } from "../../services/transactionService";
import { getBudgetAPI } from "../../services/budgetService";
import { getGoalsAPI } from "../../services/goalService";

import "../../assets/css/dashboard/dashboard.css";

import IncomeExpenseChart from "../../components/charts/IncomeExpenseChart";
import ExpenseCategoryChart from "../../components/charts/ExpenseCategoryChart";
import DashboardSkeleton from "../../components/skeletons/DashboardSkeleton";
import { getNotifications, markAllNotificationsRead, cleanOldNotifications, } from "../../utils/notificationService";
import { useSettings } from "../../context/SettingsContext";


function Dashboard() {
    const { settings, settingsLoading } = useSettings();
    useAutoLogout();

    const userName =
        settings?.profile?.name?.trim() ||
        "FinWise User";

    const userInitial =
        userName.charAt(0).toUpperCase();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [transactions, setTransactions] = useState([]);
    const [dashboardMonthlyBudget, setDashboardMonthlyBudget] = useState(0);
    const [dashboardGoals, setDashboardGoals] = useState([]);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const notificationRef = useRef(null);

    const [seenNotifications, setSeenNotifications] = useState(
        JSON.parse(localStorage.getItem("seenNotifications")
        ) || []);

    const [formData, setFormData] =
        useState({
            title: "", amount: "", type: "", category: "", date: "",
        });

    const fetchDashboardData = async (
        showSkeleton = false
    ) => {
        try {
            if (showSkeleton) {
                setPageLoading(true);
            }

            const startTime = Date.now();

            const [
                transactionResponse,
                budgetResponse,
                goalsResponse,
            ] = await Promise.all([
                getTransactionsAPI(),
                getBudgetAPI(),
                getGoalsAPI(),
            ]);

            setTransactions(
                transactionResponse.transactions || []
            );

            setDashboardMonthlyBudget(
                Number(
                    budgetResponse.budget?.monthlyBudget ||
                    0
                )
            );

            setDashboardGoals(
                goalsResponse.goals || []
            );

            if (showSkeleton) {
                const elapsed =
                    Date.now() - startTime;

                const minimumDelay = 1800;

                if (elapsed < minimumDelay) {
                    await new Promise((resolve) =>
                        setTimeout(
                            resolve,
                            minimumDelay - elapsed
                        )
                    );
                }
            }

        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                "Failed to load dashboard data"
            );

        } finally {
            if (showSkeleton) {
                setPageLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchDashboardData(true);
    }, []);
    useEffect(() => {

        const handleDashboardRefresh = () => {

            fetchDashboardData(false);

        };

        window.addEventListener(
            "focus",
            handleDashboardRefresh
        );

        document.addEventListener(
            "visibilitychange",
            handleDashboardRefresh
        );

        return () => {

            window.removeEventListener(
                "focus",
                handleDashboardRefresh
            );

            document.removeEventListener(
                "visibilitychange",
                handleDashboardRefresh
            );

        };

    }, []);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                notificationRef.current &&
                !notificationRef.current.contains(e.target)
            ) {
                setNotificationOpen(false);
            }
        };

        document.addEventListener(
            "mousedown", handleClickOutside
        );

        return () =>
            document.removeEventListener(
                "mousedown", handleClickOutside
            );
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const formatCurrency = (amount) => {
        return "₹" + Number(amount || 0).toLocaleString("en-IN");
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "No Date";

        return new Date(dateValue).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const totalIncome = useMemo(() => {
        return transactions
            .filter((item) => item.type === "income")
            .reduce((sum, item) => sum + Number(item.amount), 0);
    }, [transactions]);

    const totalExpense = useMemo(() => {
        return transactions
            .filter((item) => item.type === "expense")
            .reduce((sum, item) => sum + Number(item.amount), 0);
    }, [transactions]);

    const totalBalance = totalIncome - totalExpense;
    const totalSavings = totalBalance > 0 ? totalBalance : 0;
    const expensePercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;
    const savingsPercent = totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
    const balancePercent = totalIncome > 0 ? Math.round((totalBalance / totalIncome) * 100) : 0;

    const currentMonthExpense = transactions
        .filter((item) => {
            const date = new Date(item.date || item.createdAt);

            return (
                item.type === "expense" &&
                date.getMonth() === new Date().getMonth() &&
                date.getFullYear() === new Date().getFullYear()
            );
        })
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const dashboardBudgetPercent = dashboardMonthlyBudget > 0 ? Math.min(
        Math.round(
            (currentMonthExpense / dashboardMonthlyBudget) * 100), 100) : 0;

    const dashboardBudgetRemaining = dashboardMonthlyBudget - currentMonthExpense;
    const recentTransactions = transactions.slice(0, 3);

    const activeGoal = useMemo(() => {
        if (dashboardGoals.length === 0) {
            return null;
        }

        const sortedGoals = [
            ...dashboardGoals,
        ].sort((a, b) => {
            return (
                new Date(a.createdAt || 0) -
                new Date(b.createdAt || 0)
            );
        });

        const ongoingGoal =
            sortedGoals.find((goal) => {
                return (
                    Number(
                        goal.savedAmount || 0
                    ) <
                    Number(
                        goal.targetAmount || 0
                    )
                );
            });

        if (ongoingGoal) {
            return ongoingGoal;
        }

        return sortedGoals[0];

    }, [dashboardGoals]);

    const goalTarget = Number(activeGoal?.targetAmount || 0);
    const goalSaved = Number(activeGoal?.savedAmount || 0);

    const goalProgress = goalTarget > 0 ? Math.min(Math.round((goalSaved / goalTarget) * 100), 100) : 0;

    cleanOldNotifications();
    const storedNotifications = getNotifications();
    const trendNotifications = [];

    if (dashboardMonthlyBudget > 0 && dashboardBudgetPercent >= 85) {
        trendNotifications.push({
            id: "budget-alert",
            title: "Budget Alert",
            message: `${dashboardBudgetPercent}% of your monthly budget is used.`,
            icon: "fa-wallet",
            read: false,
            createdAt: new Date().toISOString(),
        });
    }

    if (totalExpense > totalIncome && totalIncome > 0) {
        trendNotifications.push({
            id: "overspending-alert",
            title: "Overspending Detected",
            message: "Your expenses are higher than your income.",
            icon: "fa-triangle-exclamation",
            read: false,
            createdAt: new Date().toISOString(),
        });
    }

    if (totalIncome > 0 && savingsPercent < 20) {
        trendNotifications.push({
            id: "low-saving-alert",
            title: "Low Savings Rate",
            message: `Your saving rate is only ${savingsPercent}%.`,
            icon: "fa-piggy-bank",
            read: false,
            createdAt: new Date().toISOString(),
        });
    }

    const dashboardNotifications = [...trendNotifications, ...storedNotifications,];
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !formData.title ||
            !formData.amount ||
            !formData.type ||
            !formData.category ||
            !formData.date
        ) {
            toast.error("Please fill all fields");
            return;
        }

        if (Number(formData.amount) <= 0) {
            toast.error("Amount must be greater than 0");
            return;
        }

        try {
            setSaving(true);
            await addTransactionAPI({
                title: formData.title.trim(),
                amount: Number(formData.amount),
                type: formData.type,
                category: formData.category,
                date: formData.date,
            });

            toast.success("Transaction added successfully");

            setFormData({
                title: "",
                amount: "",
                type: "",
                category: "",
                date: "",
            });

            setModalOpen(false);
            fetchDashboardData();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to add transaction");
        } finally { setSaving(false); }
    };

    return (
        <div className="dashboard-wrapper">
            {/* SIDEBAR */}
            <aside className={`sidebar ${sidebarOpen ? "active" : ""}`}>

                <div className="sidebar-logo">
                    <i className="fa-solid fa-chart-line"></i>
                    <span>FinWise</span>
                </div>

                <nav className="sidebar-menu">

                    <Link to="/dashboard" className="active">
                        <i className="fa-solid fa-table-columns"></i>
                        Dashboard
                    </Link>

                    <Link to="/transactions">
                        <i className="fa-solid fa-arrow-right-arrow-left"></i>
                        Transactions
                    </Link>

                    <Link to="/reports">
                        <i className="fa-solid fa-chart-pie"></i>
                        Analytics
                    </Link>

                    <Link to="/insights">
                        <i className="fa-solid fa-lightbulb"></i>
                        Insights
                    </Link>

                    <Link to="/budget">
                        <i className="fa-solid fa-wallet"></i>
                        Budget
                    </Link>

                    <Link to="/goals">
                        <i className="fa-solid fa-bullseye"></i>
                        Goals
                    </Link>

                    <Link to="/settings">
                        <i className="fa-solid fa-gear"></i>
                        Settings
                    </Link>
                </nav>

                <br />
                <br />

                <div className="sidebar-card">
                    <div className="sidebar-card-icon">
                        <i className="fa-solid fa-shield-halved"></i>
                    </div>

                    <h4>Smart Finance</h4>

                    <p>
                        Securely track your money and build better financial habits.
                    </p>

                    <button className="sidebar-card-btn">
                        View Insights
                    </button>
                </div>

                <div className="logout-card">
                    <div className="logout-header">
                        <div className="logout-icon">
                            <i className="fa-solid fa-right-from-bracket"></i>
                        </div>

                        <h4>Finished Working ?</h4>
                    </div>

                    <p>
                        Save your changes and sign out safely.
                    </p>

                    <button className="logout-btn" onClick={logout}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="main-content">
                {/* TOPBAR */}
                <header className="topbar premium-topbar">
                    <div className="topbar-left">
                        <button
                            className="menu-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <i className="fa-solid fa-bars"></i>
                        </button>

                        <div>
                            <h2>Welcome Back 👋</h2>
                            <p>Track your money, analyze spending, and grow your savings.</p>
                        </div>
                    </div>

                    <div className="topbar-actions">
                        <div
                            className="notification-wrapper"
                            ref={notificationRef}>
                            <button
                                className="notification"
                                onClick={() => {
                                    markAllNotificationsRead();
                                    const allIndices = dashboardNotifications.map((_, index) => index);

                                    localStorage.setItem("seenNotifications", JSON.stringify(allIndices));

                                    setSeenNotifications(allIndices);
                                    setNotificationOpen(!notificationOpen);
                                }}>

                                <i className="fa-solid fa-bell"></i>
                                {dashboardNotifications.filter(
                                    (_, index) => !seenNotifications.includes(index)
                                ).length > 0 && (
                                        <span className="notification-badge">
                                            {
                                                dashboardNotifications.filter(
                                                    (_, index) =>
                                                        !seenNotifications.includes(index)
                                                ).length > 9 ? "9+" :
                                                    dashboardNotifications.filter(
                                                        (_, index) =>
                                                            !seenNotifications.includes(index)
                                                    ).length
                                            }
                                        </span>
                                    )}
                            </button>

                            {notificationOpen && (
                                <div className="notification-dropdown">
                                    <div className="notification-header">
                                        <h4>Notifications</h4>
                                        <span>
                                            {
                                                Math.min(dashboardNotifications.length, 5)
                                            }
                                        </span>
                                    </div>

                                    {dashboardNotifications.length === 0 ? (
                                        <div className="notification-empty">
                                            No new notifications
                                        </div>
                                    ) : (
                                        dashboardNotifications
                                            .slice(0, 5)
                                            .map((item, index) => (
                                                <div className="notification-item" key={index}>
                                                    <div className="notification-item-icon">
                                                        <i className={`fa-solid ${item.icon}`}></i>
                                                    </div>

                                                    <div>
                                                        <h5>{item.title}</h5>
                                                        <p>{item.message || item.text}</p>
                                                    </div>
                                                </div>
                                            ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="profile-card">
                            <div className="user-avatar">
                                {userInitial}
                            </div>

                            <div className="user-info">
                                <h4>{userName}</h4>
                                <span>Verified User</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* CONTENT */}
                <section className="dashboard-content">
                    {
                        pageLoading || settingsLoading ? (
                            <DashboardSkeleton />
                        ) : (<>
                            <div className="overview-header">
                                <span className="section-label">
                                    FINANCIAL SUMMARY
                                </span>

                                <button
                                    className="add-btn"
                                    onClick={() => setModalOpen(true)}>

                                    <i className="fa-solid fa-plus"></i>
                                    Add Transaction
                                </button>
                            </div>

                            {/* OVERVIEW CARDS */}
                            <div className="overview-grid">
                                <div className="overview-card balance">
                                    <div className="card-icon">
                                        <i className="fa-solid fa-wallet"></i>
                                    </div>

                                    <div>
                                        <p>Total Balance</p>
                                        <h2>{formatCurrency(totalBalance)}</h2>
                                        <span id="balanceStatus">
                                            <i className="fa-solid fa-arrow-up"></i>
                                            {balancePercent}%
                                        </span>
                                    </div>
                                </div>

                                <div className="overview-card income">
                                    <div className="card-icon">
                                        <i className="fa-solid fa-arrow-trend-up"></i>
                                    </div>

                                    <div>
                                        <p>Total Income</p>
                                        <h2>{formatCurrency(totalIncome)}</h2>
                                        <span id="incomeStatus">
                                            <i className="fa-solid fa-arrow-up"></i>
                                            100%
                                        </span>
                                    </div>
                                </div>

                                <div className="overview-card expense">
                                    <div className="card-icon">
                                        <i className="fa-solid fa-arrow-trend-down"></i>
                                    </div>

                                    <div>
                                        <p>Total Expense</p>
                                        <h2>{formatCurrency(totalExpense)}</h2>
                                        <span id="expenseStatus">
                                            <i className="fa-solid fa-arrow-down"></i>
                                            {expensePercent}%
                                        </span>
                                    </div>
                                </div>

                                <div className="overview-card savings">
                                    <div className="card-icon">
                                        <i className="fa-solid fa-sack-dollar"></i>
                                    </div>

                                    <div>
                                        <p>Total Savings</p>
                                        <h2>{formatCurrency(totalSavings)}</h2>
                                        <span id="savingsStatus">
                                            <i className="fa-solid fa-arrow-up"></i>
                                            {savingsPercent}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CHARTS */}

                            <div className="dashboard-grid">
                                <div className="panel large-panel">
                                    <div className="panel-header">

                                        <div>
                                            <h3>Income vs Expense</h3>
                                            <p>Monthly financial comparison</p>
                                        </div>
                                        <span>This Year</span>
                                    </div>

                                    <div className="chart-container">
                                        <IncomeExpenseChart transactions={transactions} />
                                    </div>
                                </div>

                                <div className="panel">
                                    <div className="panel-header">

                                        <div>
                                            <h3>Expense Categories</h3>
                                            <p>Where your money goes</p>
                                        </div>
                                    </div>

                                    <div className="chart-container small">
                                        <ExpenseCategoryChart transactions={transactions} />
                                    </div>
                                </div>
                            </div>

                            {/* RECENT TRANSACTIONS + SMART INSIGHTS */}
                            <div className="dashboard-grid second-grid">
                                {/* Recent Transactions */}
                                <div className="panel">
                                    <div className="panel-header">

                                        <div>
                                            <h3>Recent Transactions</h3>
                                            <p>Your latest financial activities</p>
                                        </div>

                                        <Link
                                            to="/transactions"
                                            className="view-all"> View All </Link>
                                    </div>

                                    <div className="transaction-list">
                                        {recentTransactions.length === 0 ? (
                                            <div className="empty-transactions">
                                                <i className="fa-solid fa-wallet"></i>
                                                <h3>No Transactions Yet</h3>
                                                <p>
                                                    Click <strong>Add Transaction</strong> to start tracking your finances.
                                                </p>
                                            </div>
                                        ) : (

                                            recentTransactions.map((transaction) => {
                                                const isIncome =
                                                    transaction.type === "income";

                                                return (
                                                    <div
                                                        className="transaction-item"
                                                        key={transaction._id}>
                                                        <div className="transaction-left">
                                                            <div
                                                                className={`transaction-icon ${isIncome
                                                                    ? "income-icon"
                                                                    : "expense-icon"
                                                                    }`}>
                                                                <i
                                                                    className={`fa-solid ${isIncome
                                                                        ? "fa-arrow-trend-up"
                                                                        : "fa-arrow-trend-down"
                                                                        }`}
                                                                ></i>
                                                            </div>

                                                            <div>
                                                                <h4>{transaction.title}</h4>
                                                                <span>
                                                                    {transaction.category} • {formatDate(transaction.date)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <strong
                                                            className={
                                                                isIncome
                                                                    ? "income-text"
                                                                    : "expense-text"
                                                            }>

                                                            {isIncome ? "+ " : "- "}
                                                            {formatCurrency(transaction.amount)}
                                                        </strong>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Smart Insights */}
                                <div className="panel">
                                    <div className="panel-header">
                                        <h3>Smart Insights</h3>
                                    </div>

                                    <div className="insight-box success">
                                        <i className="fa-solid fa-circle-check"></i>
                                        <div>
                                            <h4>
                                                {savingsPercent >= 50
                                                    ? "Excellent Saving"
                                                    : "Savings Alert"}
                                            </h4>
                                            <p>
                                                {totalIncome > 0
                                                    ? savingsPercent >= 50
                                                        ? `You saved ${savingsPercent}% of your income. Great job!`
                                                        : `Your saving rate is ${savingsPercent}%. Try to reduce expenses.`
                                                    : "Add income and expenses to generate saving insights."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="insight-box warning">
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                        <div>
                                            <h4>
                                                {expensePercent > 70
                                                    ? "High Spending"
                                                    : "Expense Tracking"}
                                            </h4>
                                            <p>
                                                {totalExpense > 0
                                                    ? `Your expense usage is ${expensePercent}% of your income.`
                                                    : "Add expense transactions to see spending insights."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="insight-box info">
                                        <i className="fa-solid fa-lightbulb"></i>
                                        <div>
                                            <h4>
                                                {totalExpense > totalIncome
                                                    ? "Budget Warning"
                                                    : "Smart Suggestion"}
                                            </h4>
                                            <p>
                                                {totalExpense > totalIncome
                                                    ? "Your expenses are higher than income. Review your spending."
                                                    : "Maintain this spending pattern to build stronger savings."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BUDGET + GOAL */}
                            <div className="dashboard-grid third-grid">
                                {/* Monthly Budget */}
                                <div className="panel">
                                    <div className="panel-header">

                                        <div>
                                            <h3>Monthly Budget</h3>
                                            <p>Your budget usage this month</p>
                                        </div>

                                        <span>{dashboardBudgetPercent}% Used</span>
                                    </div>

                                    <div className="budget-box">
                                        <div
                                            className="budget-circle"
                                            style={{
                                                background: `conic-gradient(
            #22C55E 0deg,
            #22C55E ${dashboardBudgetPercent * 3.6}deg,
            #1E293B ${dashboardBudgetPercent * 3.6}deg,
            #1E293B 360deg)`,
                                            }}>
                                            <span>{dashboardBudgetPercent}%</span>
                                        </div>

                                        <div className="budget-stats">
                                            <div className="budget-stat">
                                                <span>Total Budget</span>
                                                <h4>{formatCurrency(dashboardMonthlyBudget)}</h4>
                                            </div>

                                            <div className="budget-stat">
                                                <span>Spent</span>
                                                <h4>{formatCurrency(currentMonthExpense)}</h4>
                                            </div>

                                            <div className="budget-stat">
                                                <span>Remaining</span>
                                                <h4>{formatCurrency(Math.max(dashboardBudgetRemaining, 0))}</h4>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Savings Goal Panel */}
                                <div className="panel">
                                    <div className="panel-header">
                                        <div>
                                            <h3>Savings Goal</h3>
                                            <p>
                                                {activeGoal
                                                    ? (goalProgress >= 100 ? "Goal Achieved! 🎉" : "Current Goal Progress")
                                                    : "No goal created yet"}
                                            </p>
                                        </div>
                                        <span>{goalProgress}%</span>
                                    </div>

                                    <div className="goal-box">
                                        {activeGoal ? (
                                            <>
                                                <div className="goal-top">
                                                    <div>
                                                        <h4>{activeGoal.title}</h4>
                                                        <p>
                                                            {formatCurrency(goalSaved)} saved of{" "}
                                                            {formatCurrency(goalTarget)} goal
                                                        </p>
                                                    </div>
                                                    <i className="fa-solid fa-bullseye"></i>
                                                </div>

                                                <div className="progress-bar">
                                                    <span style={{ width: `${goalProgress}%` }}></span>
                                                </div>

                                                <div className="goal-meta">
                                                    <p>{formatCurrency(goalSaved)}</p>
                                                    <p>{formatCurrency(goalTarget)}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="empty-transactions">
                                                <i className="fa-solid fa-bullseye"></i>
                                                <h3>No Goal Yet</h3>
                                                <p>Create your first goal to track it here.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                        )
                    }
                </section>

                {/* ADD TRANSACTION MODAL */}

                <div
                    className={`modal-overlay ${modalOpen ? "active" : ""}`}
                    onClick={() => setModalOpen(false)}>

                    <div
                        className="transaction-modal"
                        onClick={(e) => e.stopPropagation()}>

                        <div className="modal-header">
                            <div>
                                <h3>Add Transaction</h3>
                                <p>Record your income or expense</p>
                            </div>

                            <button
                                className="close-modal"
                                onClick={() => setModalOpen(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Transaction Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="e.g. Salary, Food, Rent"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required />
                            </div>

                            <div className="form-group">
                                <label>Amount</label>
                                <input
                                    type="number"
                                    name="amount"
                                    placeholder="Enter amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        required>
                                        <option value="">Select Type</option>
                                        <option value="income">Income</option>
                                        <option value="expense">Expense</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        required>
                                        <option value="">Select Category</option>
                                        <option value="Salary">Salary</option>
                                        <option value="Food">Food</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Shopping">Shopping</option>
                                        <option value="Bills">Bills</option>
                                        <option value="Savings">Savings</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Date</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    max={new Date().toISOString().split("T")[0]}
                                    required />
                            </div>

                            <button
                                type="submit"
                                className="submit-btn"
                                disabled={saving}>
                                {saving ? (
                                    <>
                                        <i className="fa-solid fa-spinner fa-spin"></i>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-plus"></i>
                                        Save Transaction
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;