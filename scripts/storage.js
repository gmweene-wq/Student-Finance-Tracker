
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
    getTransactions().forEach(function(transaction) {
        if (transaction.type !== 'expense') return;
        var d = new Date(transaction.date + 'T00:00:00');
        if (d.getMonth() !== now.getMonth()) return;
        else if (d.getFullYear() !== now.getFullYear()) return;
        var cat = 'Other';
        if (transaction.category) cat = transaction.category;
        if (result[cat] === undefined) result[cat] = 0;
        result[cat] += transaction.amount;
    });
    return result;
}

function getTotalIncome() {
    return sumAmounts(getTransactions().filter(function(t) { return t.type === 'income'; }));
}

// Currency settings (base ZMW + 2 manual-rate currencies)
var DEFAULT_CURRENCY_SETTINGS = {
    base: { code: 'ZMW', symbol: 'K' },
    others: [
        { code: 'RWF', symbol: 'FRw', rate: 48 },
        { code: 'USD', symbol: '$', rate: 0.037 }
    ],
    display: 'base'
};

function getCurrencySettings() {
    return getStoredJSON('currency_settings', DEFAULT_CURRENCY_SETTINGS);
}

function saveCurrencySettings(settings) {
    setStoredJSON('currency_settings', settings);
}

// Returns { rate, symbol, code } for an entry-currency select value ('base' | 'other1' | 'other2').
function getEntryCurrencyInfo(value) {
    var settings = getCurrencySettings();
    var other;
    if (value === 'other1') {
        other = settings.others[0];
    } else if (value === 'other2') {
        other = settings.others[1];
    } else {
        return { rate: 1, symbol: settings.base.symbol, code: settings.base.code };
    }

    var rate = 1;
    if (other.rate > 0) rate = other.rate;

    var symbol;
    if (other.symbol) symbol = other.symbol;
    else if (other.code) symbol = other.code;
    else symbol = settings.base.symbol;

    var code;
    if (other.code) code = other.code;
    else code = settings.base.code;

    return { rate: rate, symbol: symbol, code: code };
}

// Converts an amount entered in the given currency back to the base (ZMW) amount used for storage.
function convertEntryToBase(amount, value) {
    if (value === 'base') return amount;
    var info = getEntryCurrencyInfo(value);
    return amount / info.rate;
}

function formatMoney(amount) {
    var settings = getCurrencySettings();
    var symbol   = settings.base.symbol;
    var value    = amount;

    var other;
    if (settings.display === 'other1') {
        other = settings.others[0];
    } else if (settings.display === 'other2') {
        other = settings.others[1];
    }

    if (other && other.rate > 0) {
        value = amount * other.rate;
        if (other.symbol) symbol = other.symbol;
        else if (other.code) symbol = other.code;
        else symbol = settings.base.symbol;
    }

    return symbol + value.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
