/*! knockout.datatables v0.1.0 | https://github.com/wjbryant/Knockout.Extensions/tree/DataTables
Copyright (c) 2013 Lucas Martin | http://creativecommons.org/licenses/by/3.0/ */

/*global ko, $ */

(function () {
    'use strict';

    var _onInitializingEventName = 'ko_bindingHandlers_dataTable_onInitializing',
        _dataTablesInstanceDataKey = 'ko_bindingHandlers_dataTable_Instance';

    /**
     * This function transforms the data format that DataTables uses to transfer paging and sorting information to the server
     * to something that is a little easier to work with on the server side. The resulting object should look something like
     * this in C#:
     *
     * public class DataGridCriteria
     * {
     *     public int RecordsToTake { get; set; }
     *     public int RecordsToSkip { get; set; }
     *     public string GlobalSearchText { get; set; }
     *
     *     public ICollection<DataGridColumnCriteria> Columns { get; set; }
     * }
     *
     * public class DataGridColumnCriteria
     * {
     *     public string ColumnName { get; set; }
     *     public bool IsSorted { get; set; }
     *     public int SortOrder { get; set; }
     *     public string SearchText { get; set; }
     *     public bool IsSearchable { get; set; }
     *     public SortDirection SortDirection { get; set; }
     * }
     *
     * public enum SortDirection
     * {
     *     Ascending,
     *     Descending
     * }
     */
    function convertDataCriteria(srcOptions) {
        var destOptions = { Columns: [] },
            i,
            j,
            getColIndex = function (name) {
                var matches = name.match('\\d+');

                if (matches && matches.length) {
                    return matches[0];
                }

                return null;
            },
            sortOrder;

        // Figure out how many columns in in the data table.
        for (i = 0; i < srcOptions.length; i += 1) {
            if (srcOptions[i].name === 'iColumns') {
                for (j = 0; j < srcOptions[i].value; j += 1) {
                    destOptions.Columns.push({});
                }
                break;
            }
        }

        ko.utils.arrayForEach(srcOptions, function (item) {
            var colIndex = getColIndex(item.name);

            if (item.name === 'iDisplayStart') {
                destOptions.RecordsToSkip = item.value;
            }
            else if (item.name === 'iDisplayLength') {
                destOptions.RecordsToTake = item.value;
            }
            else if (item.name === 'sSearch') {
                destOptions.GlobalSearchText = item.value;
            }
            else if (ko.utils.stringStartsWith(item.name, 'bSearchable_')) {
                destOptions.Columns[colIndex].IsSearchable = item.value;
            }
            else if (ko.utils.stringStartsWith(item.name, 'sSearch_')) {
                destOptions.Columns[colIndex].SearchText = item.value;
            }
            else if (ko.utils.stringStartsWith(item.name, 'mDataProp_')) {
                destOptions.Columns[colIndex].ColumnName = item.value;
            }
            else if (ko.utils.stringStartsWith(item.name, 'iSortCol_')) {
                destOptions.Columns[item.value].IsSorted = true;
                destOptions.Columns[item.value].SortOrder = colIndex;

                sortOrder = ko.utils.arrayFilter(srcOptions, function (item) {
                    return item.name === 'sSortDir_' + colIndex;
                });

                if (sortOrder.length && sortOrder[0].value === 'desc') {
                    destOptions.Columns[item.value].SortDirection = 'Descending';
                }
                else {
                    destOptions.Columns[item.value].SortDirection = 'Ascending';
                }
            }
        });

        return destOptions;
    }

    function getDataTableInstance(element) {
        return $(element).data(_dataTablesInstanceDataKey);
    }

    function setDataTableInstance(element, dataTable) {
        $(element).data(_dataTablesInstanceDataKey, dataTable);
    }

    function setDataTableInstanceOnBinding(dataTable, binding) {
        if (binding && ko.isObservable(binding)) {
            binding(dataTable);
        }
    }

    ko.bindingHandlers.dataTable = {
        options: {},
        /**
         * Registers a event handler that fires when the Data Table is being initialized.
         */
        addOnInitListener: function (handler) {
            $(document).bind(_onInitializingEventName, handler);
        },
        /**
         * Unregisters an event handler to the onInitializing event.
         */
        removeOnInitListener: function (handler) {
            $(document).unbind(_onInitializingEventName, handler);
        },
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var binding = ko.utils.unwrapObservable(valueAccessor()),
                options = $.extend(true, {}, ko.bindingHandlers.dataTable.options),
                rowTemplate,
                dataSource,
                dataTable;

            /**
             * Intercepts a function with another function. The original function is passed to the new function
             * as the last argument of it's parameter list, and must be executed within the new function for the interception
             * to be complete.
             *
             * @param  {Function} fnToIntercept  The old function to intercept
             * @param  (Function) fnToExecute    The new function to be executed
             * @retuns {Function}                A proxy function that performs the interception. Execute this function
             *                                   like you would execute the fnToExecute function.
             */
            function intercept(fnToIntercept, fnToExecute) {
                fnToIntercept = fnToIntercept || function () {};
                return function () {
                    var newArguments = [];
                    $.each(arguments, function () { newArguments.push(this); });
                    newArguments.push(fnToIntercept);
                    return fnToExecute.apply(this, newArguments);
                };
            }

            // If the table has already been initialized, exit now. Sometimes knockout.js invokes the init function of a binding handler in particular
            // situations twice for a given element.
            if (getDataTableInstance(element)) {
                return;
            }

            // ** Initialize the DataTables options object with the data-bind settings **

            // Clone the options object found in the data bindings. This object will form the base for the DataTable initialization object.
            if (binding.options) {
                options = $.extend(options, binding.options);
            }

            // Define the tables columns.
            if (binding.columns && binding.columns.length) {
                options.aoColumns = [];
                ko.utils.arrayForEach(binding.columns, function (col) {

                    if (typeof col === 'string') {
                        col = { mDataProp: col };
                    }

                    options.aoColumns.push(col);
                });
            }

            // Support for computed template name and templates that change
            rowTemplate = ko.utils.unwrapObservable(binding.rowTemplate);
            if (ko.isObservable(binding.rowTemplate)) {
                binding.rowTemplate.subscribe(function (value) {
                    rowTemplate = value;
                    getDataTableInstance(element).fnDraw();
                });
            }

            // Register the row template to be used with the DataTable.
            if (binding.rowTemplate && binding.rowTemplate !== '') {
                // Intercept the fnRowCallback function.
                options.fnRowCallback = intercept(options.fnRowCallback || function (row) { return row; }, function (row, data, displayIndex, displayIndexFull, next) {
                    // Render the row template for this row.
                    ko.renderTemplate(rowTemplate, bindingContext.createChildContext(data), null, row, 'replaceChildren');
                    return next(row, data, displayIndex, displayIndexFull);
                });
            }

            // Set the data source of the DataTable.
            if (binding.dataSource) {
                dataSource = ko.utils.unwrapObservable(binding.dataSource);

                // If the data source is a function that gets the data for us...
                if (typeof dataSource === 'function' && dataSource.length === 2) {
                    // Register a fnServerData callback which calls the data source function when the DataTable requires data.
                    options.fnServerData = function (source, criteria, callback) {
                        dataSource.call(viewModel, convertDataCriteria(criteria), function (result) {
                            callback({
                                aaData: ko.utils.unwrapObservable(result.Data),
                                iTotalRecords: ko.utils.unwrapObservable(result.TotalRecords),
                                iTotalDisplayRecords: ko.utils.unwrapObservable(result.DisplayedRecords)
                            });
                        });
                    };

                    // In this data source scenario, we are relying on the server processing.
                    options.bProcessing = true;
                    options.bServerSide = true;
                }
                // If the data source is an array...
                else if (dataSource instanceof Array) {
                    // Set the initial datasource of the table.
                    options.aaData = ko.utils.unwrapObservable(binding.dataSource);

                    // If the data source is a knockout observable array...
                    if (ko.isObservable(binding.dataSource)) {
                        // Subscribe to the dataSource observable. This callback will fire whenever items are added to
                        // and removed from the data source.
                        binding.dataSource.subscribe(function (newItems) {
                            // ** Redraw table **
                            var dataTable = $(element).dataTable(),
                                tableRows,
                                unwrappedItems = [];

                            setDataTableInstanceOnBinding(dataTable, binding.table);

                            // Get a list of rows in the DataTable.
                            tableRows = dataTable.fnGetNodes();

                            // If the table contains data...
                            if (dataTable.fnGetData().length) {
                                // Clear the datatable of rows, and if there are no items to display
                                // in newItems, force the fnClearTables call to rerender the table (because
                                // the call to fnAddData with a newItems.length == 0 wont rerender the table).
                                dataTable.fnClearTable(newItems.length === 0);
                            }

                            // Unwrap the items in the data source if required.
                            ko.utils.arrayForEach(newItems, function (item) {
                                unwrappedItems.push(ko.utils.unwrapObservable(item));
                            });

                            // Add the new data back into the data table.
                            dataTable.fnAddData(unwrappedItems);

                            // Get a list of rows in the DataTable.
                            tableRows = dataTable.fnGetNodes();

                            // Unregister each of the table rows from knockout.
                            // NB: This must be called after fnAddData and fnClearTable are called because we want to allow
                            // DataTables to fire it's draw callbacks with the table's rows in their original state. Calling
                            // this any earlier will modify the tables rows, which may cause issues with third party plugins that
                            // use the data table.
                            ko.utils.arrayForEach(tableRows, function (tableRow) { ko.cleanNode(tableRow); });
                        });
                    }
                }
                // If the dataSource was not a function that retrieves data, or a javascript object array containing data.
                else {
                    throw new Error('The dataSource defined must either be a JavaScript object array, or a function that takes special parameters.');
                }
            }

            // If no fnRowCallback has been registered in the DataTable's options, then register the default fnRowCallback.
            // This default fnRowCallback function is called for every row in the data source. The intention of this callback
            // is to build a table row that is bound it's associated record in the data source via knockout js.
            if (!binding.rowTemplate || binding.rowTemplate === '') {
                options.fnRowCallback = intercept(options.fnRowCallback || function (row) { return row; }, function (row, srcData, displayIndex, displayIndexFull, next) {
                    var columns = this.fnSettings().aoColumns,
                        destRow = $(row);

                    // Empty the row that has been built by the DataTable of any child elements.
                    destRow.empty();

                    // For each column in the data table...
                    ko.utils.arrayForEach(columns, function (column) {
                        var columnName = column.mDataProp,
                            // Create a new cell.
                            newCell = $('<td></td>'),
                            accessor = '';

                        // Insert the cell in the current row.
                        destRow.append(newCell);

                        // If mDataProp is a function (since Datatables.js 1.9), then execute it
                        if (typeof columnName === 'function') {
                            accessor = columnName(srcData, 'display');
                        }
                        else {
                            accessor = eval("srcData['" + columnName.replace('.', "']['") + "']");
                        }

                        // bind the cell to the observable in the current data row.
                        accessor = eval("srcData['" + columnName.replace('.', "']['") + "']");
                        ko.applyBindingsToNode(newCell[0], { text: accessor }, bindingContext.createChildContext(srcData));
                    });

                    return next(destRow[0], srcData, displayIndex, displayIndexFull);
                });
            }

            // Before the table has it's rows rendered, we want to scan the table for elements with knockout bindings
            // and bind them to the current binding context. This is so you can bind elements like the header row of the
            // table to observables your view model. Ideally, it would be great to call ko.applyBindingsToNode here,
            // but when we initialize the table with dataTables, it seems dataTables recreates the elements in the table
            // during it's initialization proccess, killing any knockout bindings you apply before initialization. Instead,
            // we mark the elements to bind here with the ko-bind class so we can recognise the elements after the table has been initialized,
            // for binding.
            $(element).find('[data-bind]').each(function () {
                $(this).addClass('ko-bind');
            });

            // Fire the onInitializing event to allow the options object to be globally edited before the dataTables table is initialized. This
            // gives third party javascript the ability to apply any additional settings to the dataTable before load.
            $(document).trigger(_onInitializingEventName, { options: options });

            dataTable = $(element).dataTable(options);
            setDataTableInstanceOnBinding(dataTable, binding.table);
            setDataTableInstance(element, dataTable);

            // Apply bindings to those elements that were marked for binding. See comments above.
            $(element).find('.ko-bind').each(function () {
                ko.applyBindingsToNode(this, null, bindingContext);
                $(this).removeClass('ko-bind');
            });


            // Tell knockout that the control rendered by this binding is capable of managing the binding of it's descendent elements.
            // This is crucial, otherwise knockout will attempt to rebind elements that have been printed by the row template.
            return { controlsDescendantBindings: true };
        },

        getDataTableInstance: function (element) {
            return getDataTableInstance(element);
        }
    };
}());
