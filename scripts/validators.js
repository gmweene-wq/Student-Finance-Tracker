
// Regex validation 
 
var DESCRIPTION_RE   = /^\S(?:.*\S)?$/;
var DOUBLE_SPACE_RE  = /\s{2,}/;
var AMOUNT_RE = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
var DATE_RE  = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
var CATEGORY_RE = /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/;
var DUPLICATE_WORD_RE = /\b(\w+)\s+\1\b/i;

function validateDescription(value) {
    var isEmpty = ['', undefined, null].includes(value);
    if (isEmpty) {
        return { valid: true, message: '' };
    }
    if (!DESCRIPTION_RE.test(value)) {
        return { valid: false, message: 'Remove leading or trailing spaces.' };
    }
    if (DOUBLE_SPACE_RE.test(value)) {
        return { valid: false, message: 'Remove repeated spaces.' };
    }
    if (DUPLICATE_WORD_RE.test(value)) {
        return { valid: false, message: 'Looks like a word is repeated twice (e.g. "the the").' };
    }
    return { valid: true, message: '' };
}

function validateAmount(value) {
    if (!AMOUNT_RE.test(String(value).trim())) {
        return { valid: false, message: 'Enter a positive number with up to 2 decimal places (e.g. 12.50).' };
    }
    return { valid: true, message: '' };
}

function validateDate(value) {
    if (!DATE_RE.test(value)) {
        return { valid: false, message: 'Use the format YYYY-MM-DD.' };
    }
    return { valid: true, message: '' };
}

function validateCategory(value) {
    if (!value) {
        return { valid: false, message: 'Select or enter a category.' };
    }
    if (!CATEGORY_RE.test(value)) {
        return { valid: false, message: 'Use letters, spaces, or hyphens only (e.g. "Side Hustle").' };
    }
    return { valid: true, message: '' };
}

// Field error
function showFieldError(errorElId, message) {
    var errorElement = document.getElementById(errorElId);

    if (errorElement === null) {
        return;
    }
    if (message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

function validateAndShow(inputId, errorElId, validatorFn) {
    var input  = document.getElementById(inputId);
    var result = validatorFn(input.value);
    showFieldError(errorElId, result.valid ? '' : result.message);
    return result.valid;
}

// Budget enforcement helper
function checkCategoryBudget(category, newAmount, excludeId) {
    var budgets = getBudgets();
    if (!budgets[category]) return null;
    var limit = budgets[category].limit;
    var now   = new Date();
    var spent = getTransactions().reduce(function(sum, transaction) {
        if (transaction.type !== 'expense') return sum;
        if (transaction.category !== category) return sum;
        if (excludeId && transaction.id === excludeId) return sum;
        var d = new Date(transaction.date + 'T00:00:00');
        if (d.getMonth() !== now.getMonth()) return sum;
        if (d.getFullYear() !== now.getFullYear()) return sum;
        return sum + transaction.amount;
    }, 0);
    if (spent + newAmount > limit) {
        return { limit: limit, spent: spent, remaining: Math.max(0, limit - spent) };
    }
    return null;
}

// validating json before importing
function validateJSONImport(data) {
    if (!Array.isArray(data)) return false;
    if (data.length === 0) return false;
    return data.every(function(item) {
        if (item === null) return false;
        if (typeof item !== 'object') return false;
        if (typeof item.id !== 'string') return false;
        if (typeof item.amount !== 'number') return false;
        if (typeof item.date !== 'string') return false;
        if (!DATE_RE.test(item.date)) return false;
        if (item.type !== 'income' && item.type !== 'expense') return false;
        if (typeof item.category !== 'string' && typeof item.source !== 'string') return false;
        return true;
    });
}
