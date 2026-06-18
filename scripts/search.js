
// Regex search helpers (M4) 

var GLOBAL_FLAG          = 'g';
var CASE_INSENSITIVE_FLAG = 'i';

function compileSafeRegex(pattern, caseInsensitive) {
    if (!pattern) return null;

    var regexFlags;
    if (caseInsensitive) {
        regexFlags = GLOBAL_FLAG + CASE_INSENSITIVE_FLAG;
    } else {
        regexFlags = GLOBAL_FLAG;
    }

    try {
        return new RegExp(pattern, regexFlags);
    } catch (error) {
        return undefined;
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function matchesRegex(text, regex) {
    if (!regex) return true;
    regex.lastIndex = 0;
    var safeText;
    if (text) {
        safeText = text;
    } else {
        safeText = '';
    }
    return regex.test(safeText);
}

// Wraps every match of regex in <mark>, HTML-escaping the rest of the text.
function highlightText(text, regex) {
    var raw;
    if (text) {
        raw = text;
    } else {
        raw = '';
    }
    if (!regex) return escapeHtml(raw);
    regex.lastIndex = 0;
    var out       = '';
    var lastIndex = 0;
    var match;
    while ((match = regex.exec(raw)) !== null) {
        out += escapeHtml(raw.slice(lastIndex, match.index));
        out += '<mark>' + escapeHtml(match[0]) + '</mark>';
        lastIndex = match.index + match[0].length;
        if (match[0].length === 0) regex.lastIndex++;
    }
    out += escapeHtml(raw.slice(lastIndex));
    return out;
}

// Search modal
function OpenSearchModal() {
    initSearch();
    document.getElementById('searchModal').classList.add('open');
}

function CloseSearchModal() {
    document.getElementById('searchModal').classList.remove('open');
}

function initSearch() {
    var catSelect = document.getElementById('search-category');
    catSelect.innerHTML = '<option value="">All Categories</option>';
    getCategories().forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value       = cat.toLowerCase();
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });
}

// Compiles a regex and reports invalid patterns to a status element, falling back to a no-match regex.
function compileSafeRegexWithStatus(pattern, caseInsensitive, statusEl, invalidMessage) {
    var regex = compileSafeRegex(pattern, caseInsensitive);
    if (regex === undefined) {
        if (statusEl) statusEl.textContent = invalidMessage;
        return compileSafeRegex('(?!)', caseInsensitive);
    }
    if (statusEl) statusEl.textContent = '';
    return regex;
}

// Reads the search/filter inputs and re-renders the transaction list matching them
function runSearch() {
    var query    = document.getElementById('search-query').value.trim();
    var category = document.getElementById('search-category').value.toLowerCase();
    var type     = document.getElementById('search-type').value.toLowerCase();
    var fromDate = document.getElementById('search-from').value;
    var toDate   = document.getElementById('search-to').value;

    var statusEl = document.getElementById('search-status');
    var regex    = compileSafeRegexWithStatus(query, true, statusEl, 'Invalid regex pattern — showing no results.');

    var results = getTransactions().filter(function(transaction) {
        var label = getTransactionLabel(transaction);

        var description;
        if (transaction.description) {
            description = transaction.description;
        } else {
            description = '';
        }

        var matchQuery;
        if (matchesRegex(label, regex)) {
            matchQuery = true;
        } else {
            matchQuery = matchesRegex(description, regex);
        }

        var matchCat;
        if (!category) {
            matchCat = true;
        } else {
            matchCat = label.toLowerCase().includes(category);
        }

        var matchType;
        if (!type) {
            matchType = true;
        } else {
            matchType = transaction.type === type;
        }

        var matchFrom;
        if (!fromDate) {
            matchFrom = true;
        } else {
            matchFrom = transaction.date >= fromDate;
        }

        var matchTo;
        if (!toDate) {
            matchTo = true;
        } else {
            matchTo = transaction.date <= toDate;
        }

        return matchQuery && matchCat && matchType && matchFrom && matchTo;
    });

    // Rebuild the results table from scratch on every search/filter change.
    var tbody = document.getElementById('search-results-body');
    tbody.innerHTML = '';
    results.forEach(function(transaction) {
        var color = transaction.type === 'income' ? 'green' : 'red';
        var tr    = document.createElement('tr');
        tr.innerHTML =
            '<td>' + formatDate(transaction.date) + '</td>' +
            '<td>' + highlightText(getTransactionLabel(transaction), regex) + '</td>' +
            '<td style="color:' + color + '">' + formatMoney(transaction.amount) + '</td>';
        tbody.appendChild(tr);
    });

    // Toggle between the results card and the empty state based on match count.
    var resultsCard = document.getElementById('search-results-card');
    var emptyEl     = document.getElementById('search-empty');
    if (results.length > 0) {
        resultsCard.style.display = 'block';
        emptyEl.style.display     = 'none';
        var countText = results.length + ' result';
        if (results.length !== 1) countText += 's';
        document.getElementById('results-count').textContent = countText + ' found';
    } else {
        resultsCard.style.display = 'none';
        emptyEl.style.display     = 'block';
    }
}

// Records tab live regex search
function setRecordsSearch(pattern) {
    recordsSearchPattern = pattern;
    renderRecords();
}

function setRecordsSearchCI(checked) {
    recordsSearchCI = checked;
    renderRecords();
}
