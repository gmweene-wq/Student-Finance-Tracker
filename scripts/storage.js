
var DEFAULT_CATEGORIES = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];

function getStoredJSON(key, defaultValue) {
    var stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
}

function setStoredJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function sumAmounts(txns) {
    return txns.reduce(function(sum, t) { return sum + t.amount; }, 0);
}

function generateId() {
    var n = parseInt(localStorage.getItem('rec_counter') || '0', 10) + 1;
    localStorage.setItem('rec_counter', n.toString());
    return 'rec_' + String(n).padStart(4, '0');
}

var CATEGORY_COLORS = {
    'food':          '#f87171',
    'books':         '#8b5cf6',
    'transport':     '#3b82f6',
    'entertainment': '#f59e0b',
    'fees':          '#f97316',
    'other':         '#6b7280'
};
var COLOR_PALETTE = ['#f87171','#8b5cf6','#3b82f6','#f59e0b','#f97316','#6b7280','#10b981','#ec4899','#14b8a6','#84cc16'];

function getCategoryColor(name, index) {
    var color = CATEGORY_COLORS[name.toLowerCase()];
    if (color) {
        return color;
    }
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

function getTransactionLabel(transaction) {
    var base;
    if (transaction.type === 'income') {
        if (transaction.source) {
            base = transaction.source;
        } else {
            base = 'Income';
        }
    } else {
        if (transaction.category) {
            base = transaction.category;
        } else {
            base = 'Expense';
        }
    }
    if (base === 'Other' && transaction.otherNote) {
        return 'Other: ' + transaction.otherNote;
    }
    return base;
}

function getCategories() {
    return getStoredJSON('expense_categories', DEFAULT_CATEGORIES.slice());
}

function saveCategoriesToStorage(cats) {
    setStoredJSON('expense_categories', cats);
}

// Transactions storage 
function getTransactions() {
    return getStoredJSON('transactions', []);
}

function saveTransactions(txns) {
    setStoredJSON('transactions', txns);
}

function formatDate(isoDate) {
    var d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(t) {
    var datePart = formatDate(t.date);
    if (!t.createdAt) {
        return datePart;
    }
    var timeStr = new Date(t.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return datePart + '<br><span style="font-size:0.72rem;color:#9ca3af;">' + timeStr + '</span>';
}

// Card visibility (Income / Expenses card menus) 
var CARD_VISIBILITY_KEY = 'cardVisibility';

function getCardVisibility() {
    var v = getStoredJSON(CARD_VISIBILITY_KEY, {});
    return { income: v.income !== false, expense: v.expense !== false };
}

function setCardVisibility(type, visible) {
    var v = getCardVisibility();
    v[type] = visible;
    setStoredJSON(CARD_VISIBILITY_KEY, v);
}

// Budgets storage 
function getBudgets() {
    return getStoredJSON('budgets', {});
}

function saveBudgets(b) {
    setStoredJSON('budgets', b);
}

function getMonthlySpentByCategory() {
    var now    = new Date();
    var result = {};
    getTransactions().forEach(function(t) {
        if (t.type !== 'expense') return;
        var d = new Date(t.date + 'T00:00:00');
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
        var cat = t.category || 'Other';
        if (result[cat] === undefined) result[cat] = 0;
        result[cat] += t.amount;
    });
    return result;
}

function getTotalIncome() {
    return sumAmounts(getTransactions().filter(function(t) { return t.type === 'income'; }));
}

function formatMoney(amount) {
    return 'K' + amount.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
