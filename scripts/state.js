
// Runtime (in-memory, non-persisted) UI state
var MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var CHART_MAX_H = 220;

var chartYear   = new Date().getFullYear();
var chartFilter = 'both';

var expensePeriod = 'monthly';

var editingId        = null;
var editingType       = null;
var editingBudgetCat = null;

var sortOrder      = 'newest';
var filterType     = '';
var filterCategory = '';

var recordsSortOrder  = 'newest';
var recordsFilterType = '';
var recordsSearchPattern = '';
var recordsSearchCI      = true;
