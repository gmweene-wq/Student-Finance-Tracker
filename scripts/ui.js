
// Shared helpers 
function findTransactionIndexById(txns, id) {
    for (var i = 0; i < txns.length; i++) {
        if (txns[i].id === id) return i;
    }
    return -1;
}

function sortTransactionsByOrder(txns, order) {
    if (order === 'oldest') {
        txns.sort(function(a, b) { return a.date.localeCompare(b.date); });
    } else if (order === 'amount-high') {
        txns.sort(function(a, b) { return b.amount - a.amount; });
    } else if (order === 'amount-low') {
        txns.sort(function(a, b) { return a.amount - b.amount; });
    } else if (order === 'title-az') {
        txns.sort(function(a, b) { return getTransactionLabel(a).localeCompare(getTransactionLabel(b)); });
    } else if (order === 'title-za') {
        txns.sort(function(a, b) { return getTransactionLabel(b).localeCompare(getTransactionLabel(a)); });
    } else {
        txns.sort(function(a, b) { return b.date.localeCompare(a.date); });
    }
    return txns;
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// Rebuilds the category options from scratch, re-selecting the previous value since it's wiped by innerHTML reset.
function populateCategorySelect() {
    var select  = document.getElementById('expense-category-select');
    var current = select.value;
    select.innerHTML = '<option value="">Select category</option>';
    getCategories().forEach(function(cat) {
        var opt = document.createElement('option');
        opt.value       = cat;
        opt.textContent = cat;
        if (cat === current) opt.selected = true;
        select.appendChild(opt);
    });
}

// Shows the "specify other" input when the selected option is "Other", and clears it otherwise.
function toggleOtherNote(groupId, value) {
    var group = document.getElementById(groupId);
    if (!group) return;
    if (value === 'Other') {
        group.style.display = 'block';
    } else {
        group.style.display = 'none';
    }
    var input = group.querySelector('input');
    if (input && value !== 'Other') {
        input.value = '';
    }
}

// Opens the tab menu for one card (income/expense), closing the other card's menu first.
function toggleCardMenu(type) {
    var otherType = type === 'income' ? 'expense' : 'income';
    var otherDd   = document.getElementById(otherType + '-menu-dropdown');
    if (otherDd) otherDd.style.display = 'none';

    var dd = document.getElementById(type + '-menu-dropdown');
    dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

// Toggles whether a card's amount is masked, then re-renders.
function toggleCardVisibility(type) {
    var vis = getCardVisibility();
    setCardVisibility(type, !vis[type]);
    document.getElementById(type + '-menu-dropdown').style.display = 'none';
    renderTransactions();
}

// show the show/hide menu label and icon with the current card visibility state.
function updateCardMenuUI() {
    var vis = getCardVisibility();
    ['income', 'expense'].forEach(function(type) {
        var label = document.getElementById(type + '-hide-label');
        var icon  = document.getElementById(type + '-hide-icon');
        var noun  = type === 'income' ? 'Income' : 'Expenses';
        if (label) label.textContent = (vis[type] ? 'Hide ' : 'Show ') + noun;
        if (icon)  icon.className    = vis[type] ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
}

// Recomputes monthly totals and redraws all dashboard widgets and the transactions table.
function renderTransactions() {
    var txns        = getTransactions();
    var now         = new Date();
    var currentMonth = now.getMonth();
    var currentYear  = now.getFullYear();

    var monthlyIncome   = 0;
    var monthlyExpenses = 0;

    txns.forEach(function(transactions) {
        var date = new Date(transactions.date + 'T00:00:00');
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            if (transactions.type === 'income') {
                monthlyIncome += transactions.amount;
            } else {
                monthlyExpenses += transactions.amount;
            }
        }
    });

    var cardVisibility = getCardVisibility();
    document.getElementById('monthly-income').textContent = cardVisibility.income ?
        formatMoney(monthlyIncome) : '••••••';
    document.getElementById('monthly-expenses').textContent = cardVisibility.expense ?
        formatMoney(monthlyExpenses) : '••••••';
    updateCardMenuUI();

    renderChart();
    renderExpensesBreakdown();
    renderStats();
    if (document.getElementById('view-budgets').style.display !== 'none') {
        renderBudgets();
    }

    var tbody   = document.querySelector('.transactions-table tbody');
    tbody.innerHTML = '';
    var visible = getFilteredSortedTransactions();
    if (visible.length === 0 && txns.length > 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:2rem;">No transactions match the current filters.</td></tr>';
    }
    visible.forEach(function(tx) {
        var label       = getTransactionLabel(tx);
        var amountColor = tx.type === 'income' ? '#16a34a' : '#dc2626';
        var tr          = document.createElement('tr');
        tr.innerHTML =
            '<td>' + formatDateTime(tx) + '</td>' +
            '<td>' + label + '</td>' +
            '<td style="color:' + amountColor + '">' + formatMoney(tx.amount) + '</td>' +
            '<td style="color:#6b7280;font-size:0.82rem;">' + (tx.description || '—') + '</td>';
        tbody.appendChild(tr);
    });
}

//  Chart
function makeSetChartYearHandler(yr) {
    return function() {
        setChartYear(yr);
    };
}

// Returns an event handler that reveals the given chart.
function makeShowTooltip(tooltip) {
    return function() {
        tooltip.style.display = 'block';
    };
}

// Returns an event handler that hides the given chart tooltip.
function makeHideTooltip(tooltip) {
    return function() {
        tooltip.style.display = 'none';
    };
}

// Builds the year dropdown from years present in the transaction data and toggles it open/closed.
function toggleChartYearDropdown() {
    var dd  = document.getElementById('chart-year-dropdown');
    var fdd = document.getElementById('chart-filter-dropdown');
    fdd.style.display = 'none';
    if (dd.style.display !== 'none') {
        dd.style.display = 'none';
        return;
    }

    var txns  = getTransactions();
    var years = [new Date().getFullYear()];
    txns.forEach(function(t) {
        var yr = new Date(t.date + 'T00:00:00').getFullYear();
        if (years.indexOf(yr) === -1) years.push(yr);
    });
    years.sort(function(a, b) { return b - a; });

    dd.innerHTML = '';
    years.forEach(function(yr) {
        var item     = document.createElement('div');
        item.className = 'dropdown-item';
        var checkVis   = yr === chartYear ? 'visible' : 'hidden';
        item.innerHTML = '<i class="fas fa-check sort-check" style="visibility:' + checkVis + '"></i> ' + yr;
        item.onclick   = makeSetChartYearHandler(yr);
        dd.appendChild(item);
    });
    dd.style.display = 'block';
}

// Updates the selected chart year and re-renders the chart.
function setChartYear(year) {
    chartYear = year;
    document.getElementById('chart-year-label').textContent        = year;
    document.getElementById('chart-year-dropdown').style.display   = 'none';
    renderChart();
}

// Opens/closes the chart's income/expense/both filter dropdown.
function toggleChartFilterDropdown() {
    var dd  = document.getElementById('chart-filter-dropdown');
    var ydd = document.getElementById('chart-year-dropdown');
    ydd.style.display = 'none';
    if (dd.style.display === 'none') {
        dd.style.display = 'block';
    } else {
        dd.style.display = 'none';
    }
}

// Updates which series (income/expense/both) the chart displays.
function setChartFilter(filter) {
    chartFilter = filter;
    ['both', 'income', 'expense'].forEach(function(filterOption) {
        var vis = filterOption === filter ? 'visible' : 'hidden';
        document.getElementById('chart-check-' + filterOption).style.visibility = vis;
    });
    if (filter !== 'both') {
        document.getElementById('chart-filter-btn').classList.add('active');
    } else {
        document.getElementById('chart-filter-btn').classList.remove('active');
    }
    document.getElementById('chart-filter-dropdown').style.display = 'none';
    renderChart();
}

// Draws the monthly income/expense bar chart for the selected year and filter.
function renderChart() {
    var txns         = getTransactions();
    var now          = new Date();
    var currentYear  = now.getFullYear();
    var currentMonth = now.getMonth();

    var monthly = [];
    for (var m = 0; m < 12; m++) {
        monthly.push({ income: 0, expense: 0 });
    }

    txns.forEach(function(t) {
        var d = new Date(t.date + 'T00:00:00');
        if (d.getFullYear() === chartYear) {
            var month = d.getMonth();
            if (t.type === 'income') {
                monthly[month].income += t.amount;
            } else {
                monthly[month].expense += t.amount;
            }
        }
    });

    var maxTotal = 1;
    for (var n = 0; n < 12; n++) {
        var val;
        if (chartFilter === 'income') {
            val = monthly[n].income;
        } else if (chartFilter === 'expense') {
            val = monthly[n].expense;
        } else {
            val = monthly[n].income + monthly[n].expense;
        }
        if (val > maxTotal) maxTotal = val;
    }

    var container = document.getElementById('chart-container');
    container.innerHTML = '';

    var TOOLTIP_CSS =
        'position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);' +
        'background:white;padding:0.3rem 0.6rem;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.18);' +
        'font-size:0.65rem;white-space:nowrap;display:none;z-index:10;pointer-events:none;';

    monthly.forEach(function(data, idx) {
        var incomeVal  = chartFilter !== 'expense' ? data.income  : 0;
        var expenseVal = chartFilter !== 'income'  ? data.expense : 0;
        var total      = incomeVal + expenseVal;

        var barH = Math.round((total / maxTotal) * CHART_MAX_H);
        if (total > 0 && barH < 6) barH = 6;
        var incomeH  = total > 0 ? Math.round((incomeVal / total) * barH) : 0;
        var expenseH = total > 0 ? barH - incomeH : 0;

        var bar = document.createElement('div');
        if (idx === currentMonth && chartYear === currentYear) {
            bar.className = 'chart-bar active';
        } else {
            bar.className = 'chart-bar';
        }
        bar.style.height = (barH > 0 ? barH : 6) + 'px';

        var tooltipInner = '<div style="font-weight:600">' + MONTHS[idx] + ' ' + chartYear + '</div>';
        if (chartFilter !== 'expense') {
            tooltipInner += '<div style="color:blue">Income: K' + data.income.toFixed(2) + '</div>';
        }
        if (chartFilter !== 'income') {
            tooltipInner += '<div style="color:rgb(255,0,187)">Expenses: K' + data.expense.toFixed(2) + '</div>';
        }

        var tooltip = document.createElement('div');
        tooltip.style.cssText = TOOLTIP_CSS;
        tooltip.innerHTML     = tooltipInner;
        bar.appendChild(tooltip);

        bar.addEventListener('mouseenter', makeShowTooltip(tooltip));
        bar.addEventListener('mouseleave', makeHideTooltip(tooltip));

        if (incomeH > 0) {
            var inc = document.createElement('div');
            inc.className  = 'chart-bar-income';
            inc.style.height = incomeH + 'px';
            bar.appendChild(inc);
        }
        if (expenseH > 0) {
            var exp = document.createElement('div');
            exp.className  = 'chart-bar-expense';
            exp.style.height = expenseH + 'px';
            bar.appendChild(exp);
        }

        container.appendChild(bar);
    });
}

// Expenses breakdown
function getExpensesByPeriod(period) {
    var now = new Date();
    return getTransactions().filter(function(t) {
        if (t.type !== 'expense') return false;
        var d = new Date(t.date + 'T00:00:00');
        if (period === 'daily') {
            return d.toDateString() === now.toDateString();
        }
        if (period === 'weekly') {
            var weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            weekStart.setHours(0, 0, 0, 0);
            return d >= weekStart;
        }
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
}

// Renders the daily/weekly/monthly expense totals plus the per-category breakdown list and color bar.
function renderExpensesBreakdown() {
    var dailyTotal   = sumAmounts(getExpensesByPeriod('daily'));
    var weeklyTotal  = sumAmounts(getExpensesByPeriod('weekly'));
    var monthlyTotal = sumAmounts(getExpensesByPeriod('monthly'));

    document.getElementById('period-val-daily').textContent   = formatMoney(dailyTotal);
    document.getElementById('period-val-weekly').textContent  = formatMoney(weeklyTotal);
    document.getElementById('period-val-monthly').textContent = formatMoney(monthlyTotal);

    var periodTxns = getExpensesByPeriod(expensePeriod);
    var total      = sumAmounts(periodTxns);
    document.getElementById('total-all-expenses').textContent = formatMoney(total);

    var byCategory = {};
    periodTxns.forEach(function(transaction) {
        var category = transaction.category ? transaction.category : 'Other';
        if (byCategory[category] === undefined) {
            byCategory[category] = 0;
        }
        byCategory[category] += transaction.amount;
    });

    var sorted = [];
    for (var catName in byCategory) {
        sorted.push({ name: catName, amount: byCategory[catName] });
    }
    sorted.sort(function(a, b) { return b.amount - a.amount; });

    var list = document.getElementById('expense-categories-list');
    list.innerHTML = '';
    if (sorted.length === 0) {
        list.innerHTML = '<li style="color:#9ca3af;font-size:0.8rem;padding:0.75rem 0;">No expenses recorded for this period.</li>';
    } else {
        sorted.forEach(function(item, i) {
            var color = getCategoryColor(item.name, i);
            var pct   = total > 0 ? ((item.amount / total) * 100).toFixed(1) : 0;
            var li    = document.createElement('li');
            li.className = 'expense-category';
            li.innerHTML =
                '<div class="categry-info">' +
                    '<div class="categort-dot" style="background:' + color + '"></div>' +
                    '<span>' + item.name + '</span>' +
                '</div>' +
                '<span>' + formatMoney(item.amount) +
                    ' <span style="color:#9ca3af;font-size:0.72rem;">(' + pct + '%)</span>' +
                '</span>';
            list.appendChild(li);
        });
    }

    var colorBar = document.getElementById('expenses-color-bar');
    if (sorted.length === 0) {
        colorBar.style.background = '#f1f5f9';
    } else if (total === 0) {
        colorBar.style.background = '#f1f5f9';
    } else {
        var pos           = 0;
        var gradientParts = [];
        sorted.forEach(function(item, i) {
            var barColor = getCategoryColor(item.name, i);
            var pctVal   = (item.amount / total) * 100;
            gradientParts.push(barColor + ' ' + pos.toFixed(1) + '%');
            gradientParts.push(barColor + ' ' + (pos + pctVal).toFixed(1) + '%');
            pos += pctVal;
        });
        colorBar.style.background = 'linear-gradient(to right, ' + gradientParts.join(', ') + ')';
    }
}

// Stats Overview
function renderStats() {
    var totalEl = document.getElementById('stat-total-records');
    if (!totalEl) return;
    var txns = getTransactions();

    totalEl.textContent = txns.length;

    var totalSpent = sumAmounts(txns.filter(function(t) { return t.type === 'expense'; }));
    document.getElementById('stat-total-sum').textContent = formatMoney(totalSpent);

    var byCategory = {};
    txns.forEach(function(t) {
        if (t.type !== 'expense') return;
        var cat = t.category || 'Other';
        byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    });
    var topCat  = '—';
    var topAmt  = 0;
    for (var cat in byCategory) {
        if (byCategory[cat] > topAmt) { topAmt = byCategory[cat]; topCat = cat; }
    }
    document.getElementById('stat-top-category').textContent = topCat;

    // Last 7 days trend (expenses only)
    var days = [];
    for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d);
    }
    var dayTotals = days.map(function(d) {
        var key = d.toISOString().split('T')[0];
        return sumAmounts(txns.filter(function(t) { return t.type === 'expense' && t.date === key; }));
    });
    var maxDay = Math.max.apply(null, dayTotals.concat([1]));

    var trendEl = document.getElementById('trend-bars');
    trendEl.innerHTML = '';
    days.forEach(function(day, idx) {
        var h    = Math.max(4, Math.round((dayTotals[idx] / maxDay) * 60));
        var col  = document.createElement('div');
        col.className = 'trend-col';
        col.title = day.toLocaleDateString('en-ZM', { weekday: 'short' }) + ': ' + formatMoney(dayTotals[idx]);
        col.innerHTML =
            '<div class="trend-bar" style="height:' + h + 'px;"></div>' +
            '<span class="trend-label">' + day.toLocaleDateString('en-ZM', { weekday: 'short' }).charAt(0) + '</span>';
        trendEl.appendChild(col);
    });
}

// Changes which period (daily/weekly/monthly) the expense breakdown displays.
function switchExpensePeriod(period) {
    expensePeriod = period;
    document.querySelectorAll('#expense-period-tabs span').forEach(function(el) {
        el.className = el.dataset.period === period ? 'period-tab-active' : 'period-tab';
    });
    renderExpensesBreakdown();
}

// Income modal
function OpenIncomeModel() {
    editingId   = null;
    editingType = null;
    document.getElementById('income-form').reset();
    toggleOtherNote('income-other-note-group', '');
    document.getElementById('income-date-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('income-modal-title').textContent = 'Add Income';
    document.getElementById('income-submit-btn').textContent  = 'Add Income';
    openModal('incomeModal');
}

// Hides the income modal and clears editing state.
function CloseIncomeModal() {
    closeModal('incomeModal');
    editingId   = null;
    editingType = null;
}

// Validates and saves the income form, updating the transaction being edited or creating a new one.
function SubmitIncome(e) {
    e.preventDefault();
    var amountValid = validateAndShow('income-amount-input', 'income-amount-error', validateAmount);
    var sourceValid  = validateAndShow('income-source-select', 'income-source-error', validateSource);
    var dateValid    = validateAndShow('income-date-input', 'income-date-error', validateDate);
    var descValid    = validateAndShow('income-desc-input', 'income-desc-error', validateDescription);
    if (amountValid === false) {
        return;
    } else if (sourceValid === false) {
        return;
    } else if (dateValid === false) {
        return;
    } else if (descValid === false) {
        return;
    }

    var amount      = parseFloat(document.getElementById('income-amount-input').value) || 0;
    var source      = document.getElementById('income-source-select').value;
    var date        = document.getElementById('income-date-input').value;
    var description = document.getElementById('income-desc-input').value.trim();
    var otherNote   = '';
    if (source === 'Other') {
        otherNote = document.getElementById('income-other-note-input').value.trim();
    }
    if (!amount) {
        return;
    } else if (!date) {
        return;
    }

    var txns = getTransactions();
    if (editingId && editingType === 'income') {
        var i = findTransactionIndexById(txns, editingId);
        txns[i].amount      = amount;
        txns[i].source      = source;
        txns[i].date        = date;
        txns[i].description = description;
        txns[i].otherNote   = otherNote;
        txns[i].updatedAt   = new Date().toISOString();
    } else {
        var now = new Date().toISOString();
        txns.push({ id: generateId(), type: 'income', amount: amount, source: source, date: date, description: description, otherNote: otherNote, createdAt: now, updatedAt: now });
    }
    saveTransactions(txns);
    e.target.reset();
    toggleOtherNote('income-other-note-group', '');
    CloseIncomeModal();
    renderTransactions();
    renderRecords();
    showToast('Income saved!');
}

// Expense modal
function OpenExpenseModel() {
    editingId   = null;
    editingType = null;
    populateCategorySelect();
    document.getElementById('expense-form').reset();
    toggleOtherNote('expense-other-note-group', '');
    document.getElementById('expense-date-input').value = new Date().toISOString().split('T')[0];
    document.getElementById('expense-modal-title').textContent = 'Add Expense';
    document.getElementById('expense-submit-btn').textContent  = 'Add Expense';
    document.getElementById('expense-modal-error').style.display = 'none';
    openModal('expenseModal');
}

// Hides the expense modal, clears its error message, and clears editing state.
function CloseExpenseModal() {
    closeModal('expenseModal');
    document.getElementById('expense-modal-error').style.display = 'none';
    editingId   = null;
    editingType = null;
}

// Validates the expense form, checks it against the category budget, then saves it.
function SubmitExpense(e) {
    e.preventDefault();
    var amountValid   = validateAndShow('expense-amount-input', 'expense-amount-error', validateAmount);
    var categoryValid = validateAndShow('expense-category-select', 'expense-category-error', validateCategory);
    var dateValid    = validateAndShow('expense-date-input', 'expense-date-error', validateDate);
    var descValid    = validateAndShow('expense-desc-input', 'expense-desc-error', validateDescription);
    if (amountValid === false) {
        return;
    } else if (categoryValid === false) {
        return;
    } else if (dateValid === false) {
        return;
    } else if (descValid === false) {
        return;
    }

    var amount      = parseFloat(document.getElementById('expense-amount-input').value) || 0;
    var category    = document.getElementById('expense-category-select').value;
    var date        = document.getElementById('expense-date-input').value;
    var description = document.getElementById('expense-desc-input').value.trim();
    var otherNote   = '';
    if (category === 'Other') {
        otherNote = document.getElementById('expense-other-note-input').value.trim();
    }
    if (!amount) {
        return;
    } else if (!date) {
        return;
    }

    var isEditing = editingId && editingType === 'expense';
    var errorEl   = document.getElementById('expense-modal-error');
    var over      = checkCategoryBudget(category, amount, isEditing ? editingId : null);
    if (over) {
        errorEl.textContent = 'Over budget — ' + category + ' limit is ' + formatMoney(over.limit) +
            ' and you have ' + formatMoney(over.remaining) + ' remaining this month.';
        errorEl.style.display = 'block';
        return;
    }
    errorEl.style.display = 'none';

    var txns = getTransactions();
    if (isEditing) {
        var i = findTransactionIndexById(txns, editingId);
        txns[i].amount      = amount;
        txns[i].category    = category;
        txns[i].date        = date;
        txns[i].description = description;
        txns[i].otherNote   = otherNote;
        txns[i].updatedAt   = new Date().toISOString();
    } else {
        var now = new Date().toISOString();
        txns.push({ id: generateId(), type: 'expense', amount: amount, category: category, date: date, description: description, otherNote: otherNote, createdAt: now, updatedAt: now });
    }
    saveTransactions(txns);
    e.target.reset();
    toggleOtherNote('expense-other-note-group', '');
    CloseExpenseModal();
    renderTransactions();
    renderRecords();
    showToast('Expense saved!');
}

//  Categories modal
function OpenCategoriesModal() {
    renderCategoriesList();
    openModal('categoriesModal');
}

// Hides the categories modal and refreshes the expense category select to reflect any changes.
function CloseCategoriesModal() {
    closeModal('categoriesModal');
    populateCategorySelect();
}

// Rebuilds the editable list of categories shown in the categories modal.
function renderCategoriesList() {
    var list = document.getElementById('categories-list');
    list.innerHTML = '';
    getCategories().forEach(function(cat, i) {
        var item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML =
            '<input type="text" class="form-input category-edit-input" value="' + cat + '" data-index="' + i + '" />' +
            '<button type="button" class="btn-delete-category" onclick="DeleteCategory(' + i + ')" title="Delete">' +
                '<i class="fas fa-trash"></i>' +
            '</button>';
        list.appendChild(item);
    });
}

// Removes a category by index and persists the change.
function DeleteCategory(index) {
    var cats = getCategories();
    cats.splice(index, 1);
    saveCategoriesToStorage(cats);
    renderCategoriesList();
}

// Validates and adds a new category from the input field, ignoring duplicates.
function AddCategory() {
    var input = document.getElementById('new-category-input');
    var name  = input.value.trim();
    if (!name) return;
    var check = validateCategory(name);
    showFieldError('new-category-error', check.valid ? '' : check.message);
    if (!check.valid) return;
    var cats          = getCategories();
    var alreadyExists = false;
    for (var i = 0; i < cats.length; i++) {
        if (cats[i].toLowerCase() === name.toLowerCase()) {
            alreadyExists = true;
            break;
        }
    }
    if (!alreadyExists) {
        cats.push(name);
        saveCategoriesToStorage(cats);
    }
    input.value = '';
    renderCategoriesList();
}

// Persists the edited category names from the categories modal inputs.
function SaveCategories() {
    var cats = [];
    document.querySelectorAll('.category-edit-input').forEach(function(inp) {
        var val = inp.value.trim();
        if (val) cats.push(val);
    });
    saveCategoriesToStorage(cats);
    CloseCategoriesModal();
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab-view').forEach(function(v) { v.style.display = 'none'; });
    document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.remove('tab-active');
        b.setAttribute('aria-selected', 'false');
    });
    document.getElementById('view-' + tab).style.display = 'block';
    var activeBtn = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
    activeBtn.classList.add('tab-active');
    activeBtn.setAttribute('aria-selected', 'true');
    if (tab === 'budgets')  renderBudgets();
    if (tab === 'records')  renderRecords();
}

//  Budgets
function renderBudgets() {
    var budgets         = getBudgets();
    var spentByCategory = getMonthlySpentByCategory();
    var grid            = document.getElementById('budget-grid');
    grid.innerHTML      = '';

    var totalLimit = 0;
    var totalSpent = 0;

    var budgetKeys = Object.keys(budgets);
    if (budgetKeys.length === 0) {
        grid.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;padding:1rem 0;">No budgets set yet. Click "Set Budget" to get started.</p>';
    }

    budgetKeys.forEach(function(cat) {
        var limit = budgets[cat].limit;
        var spent = spentByCategory[cat] || 0;
        totalLimit += limit;
        totalSpent += spent;
        var pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
        var cls;
        if (pct >= 100) {
            cls = 'danger';
        } else if (pct >= 75) {
            cls = 'warning';
        } else {
            cls = 'safe';
        }

        var card = document.createElement('div');
        card.className = 'budget-card';
        card.innerHTML =
            '<div class="budget-cat-name">' + cat + '</div>' +
            '<div class="budget-amounts">' +
                '<span>Spent: <b>' + formatMoney(spent) + '</b></span>' +
                '<span>Limit: ' + formatMoney(limit) + '</span>' +
            '</div>' +
            '<div class="budget-bar">' +
                '<div class="budget-bar-fill ' + cls + '" style="width:' + pct + '%"></div>' +
            '</div>' +
            '<div class="budget-pct">' + pct + '% used</div>' +
            '<button class="budget-edit-btn" onclick="OpenBudgetModal(\'' + cat + '\', ' + limit + ')">' +
                '<i class="fas fa-pen"></i> Edit' +
            '</button>';
        grid.appendChild(card);
    });

    var remaining = totalLimit - totalSpent;
    document.getElementById('total-budgeted').textContent  = formatMoney(totalLimit);
    document.getElementById('total-spent').textContent     = formatMoney(totalSpent);
    document.getElementById('total-remaining').textContent = formatMoney(Math.max(0, remaining));
}

// Opens the budget modal pre-filled for a category, or lets the user pick one if none was given.
function OpenBudgetModal(cat, limit) {
    if (cat === undefined)   cat   = '';
    if (limit === undefined) limit = 0;
    editingBudgetCat = cat || null;

    var catSelect  = document.getElementById('budget-cat-select');
    var catDisplay = document.getElementById('budget-cat-display');

    if (cat) {
        catSelect.style.display  = 'none';
        catDisplay.style.display = 'block';
        catDisplay.textContent   = cat;
    } else {
        catSelect.style.display  = 'block';
        catDisplay.style.display = 'none';
        catSelect.innerHTML      = '<option value="">Select category</option>';
        getCategories().forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c; opt.textContent = c;
            catSelect.appendChild(opt);
        });
    }

    document.getElementById('budget-limit-input').value = limit || '';
    openModal('budgetModal');
}

// Hides the budget modal, clears its error, and clears editing state.
function CloseBudgetModal() {
    closeModal('budgetModal');
    document.getElementById('budget-error').style.display = 'none';
    editingBudgetCat = null;
}

// Validates that the new budget total doesn't exceed recorded income, then saves it.
function SubmitBudget(e) {
    e.preventDefault();
    var cat   = editingBudgetCat || document.getElementById('budget-cat-select').value;
    var limit = parseFloat(document.getElementById('budget-limit-input').value) || 0;
    if (!cat) return;

    var budgets     = getBudgets();
    var totalIncome = getTotalIncome();

    if (totalIncome > 0) {
        var otherBudgetsTotal = 0;
        for (var key in budgets) {
            if (key !== cat) otherBudgetsTotal += budgets[key].limit;
        }
        var newTotal = otherBudgetsTotal + limit;
        if (newTotal > totalIncome) {
            var errorEl = document.getElementById('budget-error');
            errorEl.textContent =
                'Insufficient funds — total budgeted (' + formatMoney(newTotal) +
                ') would exceed your recorded income (' + formatMoney(totalIncome) +
                '). You have ' + formatMoney(totalIncome - otherBudgetsTotal) + ' left to allocate.';
            errorEl.style.display = 'block';
            return;
        }
    }

    document.getElementById('budget-error').style.display = 'none';
    budgets[cat] = { limit: limit };
    saveBudgets(budgets);
    CloseBudgetModal();
    renderBudgets();
}

//  Sort & Filter
function getFilteredSortedTransactions() {
    var txns = getTransactions();

    if (filterType) {
        txns = txns.filter(function(t) { return t.type === filterType; });
    }
    if (filterCategory) {
        txns = txns.filter(function(t) {
            if (t.source === filterCategory) {
                return true;
            } else if (t.category === filterCategory) {
                return true;
            }
            return false;
        });
    }

    return sortTransactionsByOrder(txns, sortOrder);
}

// Opens/closes the transactions sort dropdown.
function toggleSortDropdown() {
    var dd  = document.getElementById('sort-dropdown');
    var fdd = document.getElementById('filter-dropdown');
    fdd.style.display = 'none';
    if (dd.style.display === 'none') {
        dd.style.display = 'block';
    } else {
        dd.style.display = 'none';
    }
}

// Builds the filter category options from existing transactions and toggles the filter dropdown.
function toggleFilterDropdown() {
    var dd  = document.getElementById('filter-dropdown');
    var sdd = document.getElementById('sort-dropdown');
    sdd.style.display = 'none';
    if (dd.style.display !== 'none') { dd.style.display = 'none'; return; }

    var catSelect  = document.getElementById('filter-cat-select');
    var currentVal = catSelect.value;
    catSelect.innerHTML = '<option value="">All</option>';

    var txns    = getTransactions();
    var sources = [];
    var cats    = [];

    txns.forEach(function(t) {
        if (t.type === 'income' && t.source && sources.indexOf(t.source) === -1) {
            sources.push(t.source);
        }
        if (t.type === 'expense' && t.category && cats.indexOf(t.category) === -1) {
            cats.push(t.category);
        }
    });

    if (sources.length > 0) {
        var g1 = document.createElement('optgroup');
        g1.label = 'Income Sources';
        sources.forEach(function(s) {
            var o = document.createElement('option');
            o.value = s; o.textContent = s;
            if (s === currentVal) o.selected = true;
            g1.appendChild(o);
        });
        catSelect.appendChild(g1);
    }
    if (cats.length > 0) {
        var g2 = document.createElement('optgroup');
        g2.label = 'Expense Categories';
        cats.forEach(function(c) {
            var o = document.createElement('option');
            o.value = c; o.textContent = c;
            if (c === currentVal) o.selected = true;
            g2.appendChild(o);
        });
        catSelect.appendChild(g2);
    }
    dd.style.display = 'block';
}

// Updates the active sort order and re-renders the transactions list.
function setSort(order) {
    sortOrder = order;
    ['newest', 'oldest', 'amount-high', 'amount-low'].forEach(function(o) {
        document.getElementById('check-' + o).style.visibility = o === order ? 'visible' : 'hidden';
    });
    if (order !== 'newest') {
        document.getElementById('sort-btn').classList.add('active');
    } else {
        document.getElementById('sort-btn').classList.remove('active');
    }
    document.getElementById('sort-dropdown').style.display = 'none';
    updateActiveFiltersBar();
    renderTransactions();
}

// Reads the filter selects and re-renders the transactions list immediately.
function applyFilterInstant() {
    filterType     = document.getElementById('filter-type-select').value;
    filterCategory = document.getElementById('filter-cat-select').value;
    if (filterType) {
        document.getElementById('filter-btn').classList.add('active');
    } else if (filterCategory) {
        document.getElementById('filter-btn').classList.add('active');
    } else {
        document.getElementById('filter-btn').classList.remove('active');
    }
    updateActiveFiltersBar();
    renderTransactions();
}

// Resets both transaction filters and re-renders.
function clearTransactionFilters() {
    filterType     = '';
    filterCategory = '';
    document.getElementById('filter-type-select').value = '';
    document.getElementById('filter-cat-select').value  = '';
    document.getElementById('filter-btn').classList.remove('active');
    document.getElementById('filter-dropdown').style.display = 'none';
    updateActiveFiltersBar();
    renderTransactions();
}

// Clears just the type filter, keeping any category filter active.
function clearFilterType() {
    filterType = '';
    document.getElementById('filter-type-select').value = '';
    if (filterCategory) {
        document.getElementById('filter-btn').classList.add('active');
    } else {
        document.getElementById('filter-btn').classList.remove('active');
    }
    updateActiveFiltersBar();
    renderTransactions();
}

// Clears just the category filter, keeping any type filter active.
function clearFilterCategory() {
    filterCategory = '';
    document.getElementById('filter-cat-select').value = '';
    if (filterType) {
        document.getElementById('filter-btn').classList.add('active');
    } else {
        document.getElementById('filter-btn').classList.remove('active');
    }
    updateActiveFiltersBar();
    renderTransactions();
}

// Rebuilds the "active filters" tag bar shown above the transactions table.
function updateActiveFiltersBar() {
    var bar        = document.getElementById('active-filters-bar');
    var tags       = [];
    var sortLabels = { 'oldest': 'Oldest first', 'amount-high': 'Amount: High to Low', 'amount-low': 'Amount: Low to High' };
    if (sortOrder !== 'newest') {
        tags.push('<span class="filter-tag">Sort: ' + sortLabels[sortOrder] +
            ' <button onclick="setSort(\'newest\')"><i class="fas fa-times"></i></button></span>');
    }
    if (filterType) {
        tags.push('<span class="filter-tag">Type: ' + filterType +
            ' <button onclick="clearFilterType()"><i class="fas fa-times"></i></button></span>');
    }
    if (filterCategory) {
        tags.push('<span class="filter-tag">' + filterCategory +
            ' <button onclick="clearFilterCategory()"><i class="fas fa-times"></i></button></span>');
    }
    bar.innerHTML = tags.join('');
    if (tags.length > 0) {
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }
}

// Records tab 
function setRecordsSort(order)      { recordsSortOrder  = order; renderRecords(); }
function setRecordsFilterType(type) { recordsFilterType = type;  renderRecords(); }

// Filters, regex-searches, and sorts transactions for the Records tab, then renders the table and card views.
function renderRecords() {
    var txns = getTransactions();
    if (recordsFilterType) {
        txns = txns.filter(function(t) { return t.type === recordsFilterType; });
    }

    var statusEl = document.getElementById('records-search-status');
    var regex    = compileSafeRegexWithStatus(recordsSearchPattern, recordsSearchCI, statusEl, 'Invalid regex pattern — fix it to see matches.');
    txns = txns.filter(function(t) {
        if (matchesRegex(getTransactionLabel(t), regex)) {
            return true;
        } else if (matchesRegex(t.description || '', regex)) {
            return true;
        }
        return false;
    });

    txns = sortTransactionsByOrder(txns, recordsSortOrder);

    var countText = txns.length + ' record';
    if (txns.length !== 1) countText += 's';
    document.getElementById('records-count').textContent = countText;

    var tbody = document.getElementById('records-tbody');
    tbody.innerHTML = '';
    var cards = document.getElementById('records-cards');
    cards.innerHTML = '';

    if (txns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:2rem;">No transactions match.</td></tr>';
        cards.innerHTML = '<p style="text-align:center;color:#9ca3af;padding:2rem 0;">No transactions match.</p>';
        return;
    }

    txns.forEach(function(t) {
        var label       = highlightText(getTransactionLabel(t), regex);
        var descHighlit = highlightText(t.description || '', regex);
        var amtColor    = t.type === 'income' ? '#16a34a' : '#dc2626';

        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + formatDate(t.date) + '</td>' +
            '<td><span class="type-badge type-' + t.type + '">' + t.type + '</span></td>' +
            '<td>' + label + '</td>' +
            '<td style="color:' + amtColor + ';font-weight:600;">' + formatMoney(t.amount) + '</td>' +
            '<td style="color:#6b7280;font-size:0.82rem;">' + (t.description ? descHighlit : '—') + '</td>' +
            '<td>' +
                '<button class="action-btn" onclick="editTransaction(\'' + t.id + '\')" title="Edit"><i class="fas fa-pen"></i></button>' +
                '<button class="action-btn" onclick="deleteTransaction(\'' + t.id + '\')" title="Delete" style="color:#ef4444;border-color:#fecaca;margin-left:4px;"><i class="fas fa-trash"></i></button>' +
            '</td>';
        tbody.appendChild(tr);

        var descHtml = t.description ? '<span>' + descHighlit + '</span>' : '';
        var card     = document.createElement('div');
        card.className = 'record-card';
        card.innerHTML =
            '<div class="record-card-header">' +
                '<span class="type-badge type-' + t.type + '">' + t.type + '</span>' +
                '<span style="color:' + amtColor + ';font-weight:700;font-size:1rem;">' + formatMoney(t.amount) + '</span>' +
            '</div>' +
            '<div class="record-card-label">' + label + '</div>' +
            '<div class="record-card-meta"><span>' + formatDate(t.date) + '</span>' + descHtml + '</div>' +
            '<div class="record-card-actions">' +
                '<button class="action-btn" onclick="editTransaction(\'' + t.id + '\')"><i class="fas fa-pen"></i> Edit</button>' +
                '<button class="action-btn" onclick="deleteTransaction(\'' + t.id + '\')" style="color:#ef4444;border-color:#fecaca;"><i class="fas fa-trash"></i> Delete</button>' +
            '</div>';
        cards.appendChild(card);
    });
}

// Confirms then permanently removes a transaction.
function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    saveTransactions(getTransactions().filter(function(t) { return t.id !== id; }));
    renderTransactions();
    renderRecords();
    showToast('Transaction deleted.');
}

// ── Edit transaction (opens the relevant Add modal pre-filled) ────────────────
function editTransaction(id) {
    var txns = getTransactions();
    var idx  = findTransactionIndexById(txns, id);
    if (idx === -1) return;
    var t = txns[idx];

    if (t.type === 'income') {
        var source = '';
        if (t.source) source = t.source;
        var description = '';
        if (t.description) description = t.description;
        var otherNote = '';
        if (t.otherNote) otherNote = t.otherNote;

        document.getElementById('income-amount-input').value = t.amount;
        document.getElementById('income-source-select').value = source;
        document.getElementById('income-date-input').value   = t.date;
        document.getElementById('income-desc-input').value   = description;
        toggleOtherNote('income-other-note-group', source);
        if (t.source === 'Other') {
            document.getElementById('income-other-note-input').value = otherNote;
        }
        document.getElementById('income-modal-title').textContent = 'Edit Income';
        document.getElementById('income-submit-btn').textContent  = 'Update Income';
        editingId   = id;
        editingType = 'income';
        openModal('incomeModal');
    } else {
        var category = '';
        if (t.category) category = t.category;
        var description = '';
        if (t.description) description = t.description;
        var otherNote = '';
        if (t.otherNote) otherNote = t.otherNote;

        populateCategorySelect();
        document.getElementById('expense-amount-input').value = t.amount;
        document.getElementById('expense-category-select').value = category;
        toggleOtherNote('expense-other-note-group', category);
        if (t.category === 'Other') {
            document.getElementById('expense-other-note-input').value = otherNote;
        }
        document.getElementById('expense-date-input').value = t.date;
        document.getElementById('expense-desc-input').value = description;
        document.getElementById('expense-modal-title').textContent = 'Edit Expense';
        document.getElementById('expense-submit-btn').textContent  = 'Update Expense';
        document.getElementById('expense-modal-error').style.display = 'none';
        editingId   = id;
        editingType = 'expense';
        openModal('expenseModal');
    }
}

// Confirms then wipes all stored transactions, budgets, and categories.
function clearAllData() {
    if (!confirm('This will permanently delete ALL transactions and budgets. Are you sure?')) return;
    localStorage.removeItem('transactions');
    localStorage.removeItem('budgets');
    localStorage.removeItem('expense_categories');
    renderTransactions();
    renderRecords();
    showToast('All data cleared.');
}

// Downloads all transactions as a CSV file.
function exportCSV() {
    var txns = getTransactions();
    if (!txns.length) { showToast('No transactions to export.'); return; }

    txns.sort(function(a, b) { return b.date.localeCompare(a.date); });

    var rows = [['Date', 'Type', 'Category/Source', 'Amount (K)', 'Description']];
    txns.forEach(function(t) {
        rows.push([t.date, t.type, getTransactionLabel(t), t.amount.toFixed(2), t.description || '']);
    });

    var csvLines = rows.map(function(row) {
        return row.map(function(cell) {
            return '"' + String(cell).replace(/"/g, '""') + '"';
        }).join(',');
    });

    var csv  = csvLines.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!');
}

// JSON Export / Import 
function exportJSON() {
    var txns = getTransactions();
    if (!txns.length) { showToast('No transactions to export.'); return; }
    var blob = new Blob([JSON.stringify(txns, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'transactions.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON downloaded!');
}

// Programmatically clicks the hidden JSON file input to open the file picker.
function triggerJSONImport() {
    var input = document.getElementById('json-import-input');
    if (input) input.click();
}

// Reads, validates, and imports a JSON transactions file, replacing current data after confirmation.
function handleJSONImport(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        var data;
        try {
            data = JSON.parse(e.target.result);
        } catch (err) {
            showToast('Error: file is not valid JSON.');
            return;
        }
        if (!validateJSONImport(data)) {
            showToast('Error: JSON structure is invalid. Import cancelled.');
            return;
        }
        if (!confirm('Replace all current data with ' + data.length + ' imported records?')) return;
        saveTransactions(data);
        renderTransactions();
        renderRecords();
        showToast('Imported ' + data.length + ' records successfully.');
    };
    reader.readAsText(file);
}

// Toast 
function showToast(msg) {
    var toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.style.cssText =
            'position:fixed;bottom:5rem;left:50%;transform:translateX(-50%);' +
            'background:#1e293b;color:white;padding:0.6rem 1.4rem;' +
            'border-radius:9999px;font-size:0.85rem;z-index:9999;' +
            'box-shadow:0 4px 12px rgba(0,0,0,0.2);transition:opacity 0.3s;pointer-events:none;';
        document.body.appendChild(toast);
    }
    toast.textContent   = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(function() {
        toast.style.opacity = '0';
    }, 2500);
}
