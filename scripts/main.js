
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('new-category-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') { event.preventDefault(); AddCategory(); }
    });
    document.getElementById('search-query').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') runSearch();
    });

    if (localStorage.getItem('budgets_version') !== '2') {
        localStorage.removeItem('budgets');
        localStorage.setItem('budgets_version', '2');
    }

    renderTransactions();
});

// Modal a11y: focus trap, focus return, Escape-to-close 
var modalTrigger = null;

function getFocusable(container) {
    return Array.prototype.slice
        .call(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(function(element) { return !element.disabled && element.offsetParent !== null; });
}

var MODAL_CLOSERS = {
    incomeModal: function() { CloseIncomeModal(); },
    expenseModal: function() { CloseExpenseModal(); },
    categoriesModal: function() { CloseCategoriesModal(); },
    budgetModal: function() { CloseBudgetModal(); },
    searchModal: function() { CloseSearchModal(); }
};

document.querySelectorAll('.modal-overlay').forEach(function(modal) {
    var observer = new MutationObserver(function() {
        if (modal.classList.contains('open')) {
            modalTrigger = document.activeElement;
            var focusables = getFocusable(modal);
            if (focusables.length) focusables[0].focus();
        } else if (modalTrigger) {
            modalTrigger.focus();
            modalTrigger = null;
        }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
});

document.addEventListener('keydown', function(e) {
    var openModal = document.querySelector('.modal-overlay.open');
    if (!openModal) return;

    if (e.key === 'Escape') {
        var close = MODAL_CLOSERS[openModal.id];
        if (close) close();
        return;
    }

    if (e.key === 'Tab') {
        var focusables = getFocusable(openModal);
        if (!focusables.length) return;
        var first = focusables[0];
        var last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }
});

// Close modals on backdrop click; close dropdowns on outside click
var DROPDOWN_WRAPPERS = [['sort-wrapper', 'sort-dropdown'], ['filter-wrapper', 'filter-dropdown'], ['chart-year-wrapper', 'chart-year-dropdown'], ['chart-filter-wrapper', 'chart-filter-dropdown'], ['income-menu-wrapper', 'income-menu-dropdown'], ['expense-menu-wrapper', 'expense-menu-dropdown']];

document.addEventListener('click', function(clickEvent) {
    if (clickEvent.target.classList.contains('modal-overlay')) {
        clickEvent.target.classList.remove('open');
        if (clickEvent.target.id === 'incomeModal') {
            editingId   = null;
            editingType = null;
        } else if (clickEvent.target.id === 'expenseModal') {
            editingId   = null;
            editingType = null;
        }
        populateCategorySelect();
    }
    DROPDOWN_WRAPPERS.forEach(function(pair) {
        if (clickEvent.target.closest('#' + pair[0])) return;
        var dropdownElement = document.getElementById(pair[1]);
        if (dropdownElement) dropdownElement.style.display = 'none';
    });
});
