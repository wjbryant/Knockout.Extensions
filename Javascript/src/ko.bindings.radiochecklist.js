/// <reference path="knockout-1.3.0beta.debug.js" />
/// <reference path="knockout.mapping-latest.js" />
/// <reference path="jquery-1.5.2-vsdoc.js" />
/// <reference path="jquery.dataTables.js" />

/**
* A KnockoutJs binding handler that creates a Radio Button List or a Check Box List Control that is bound by knockout in a similar way 
* to Drop Down or List Box controls.  
*
* File:         cog.knockout.radiochecklist.js
* Version:      0.1
* Author:       Lucas Martin
* License:      Creative Commons Attribution 3.0 Unported License. http://creativecommons.org/licenses/by/3.0/ 
* 
* Copyright 2011, All Rights Reserved, Cognitive Shift http://www.cogshift.com  
*
* For more information about KnockoutJs or DataTables, see http://www.knockoutjs.com and http://www.datatables.com for details.                    
*/
(function () {
    var selectedOptionsInit = ko.bindingHandlers.selectedOptions.init;
    var selectedOptionsUpdate = ko.bindingHandlers.selectedOptions.update;
    var optionsUpdate = ko.bindingHandlers.options.update;
    var valueInit = ko.bindingHandlers.value.init;
    var valueUpdate = ko.bindingHandlers.value.update;

    var checkListCss = 'cog-checklist';
    var radioListCss = 'cog-radiolist';
    var processedKey = 'IsProcessed';
    var controlIdPrefix = "ctrl_group_";
    var controlCounter = 0;

    ko.bindingHandlers.value = $.extend(ko.bindingHandlers.value, 
    // Adds support for the Value binding to the RadioButtonList control.
    {
        // Responsible for setting up a click listener on each input in the list control that propogates any 
        // selection back to the view model
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            
            var valueObservable = valueAccessor();
            var control = $(element);

            if (isRadioButtonListControl(element)) {
                control.delegate('input', 'click', function(e) { 
                    var input = $(this);
                    var value = input.attr('value');
                    var isChecked = input.attr('checked');

                    if(isChecked)
                        valueObservable(value);

                    // Prevent the click event from bubbling up through the DOM.  This is important because when this click event handler is finished,
                    // other handlers after this one will execute.  If the input that invoked this handler is deleted in the "options" binding, then
                    // this may cause havock with other javascript libraries.  In particular, not calling stopPropagation() here will cause issues with
                    // jQuery validation when the library goes searching for the form the input belongs to after the input has been deleted.
                    e.stopPropagation();
                });
            } else if (!isPlaceholder(element) && !isListControl(element)) {
                valueInit(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
            }
        },
        // Responsible for propogating any selection changes in the view model back to the list control
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            
            var valueObservable = valueAccessor();
            var control = $(element);
            
            if(isRadioButtonListControl(element)) {
                var value = ko.utils.unwrapObservable(valueObservable);
                var inputs = control.find('input');
                
                // Reset all radiobuttons to unchecked.
                inputs.attr('checked', false);    

                inputs.filter('[value="' + value + '"]').attr('checked', true);
            
            } else if (!isPlaceholder(element) && !isListControl(element)) {
                valueUpdate(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
            }
        }
    });

    ko.bindingHandlers.selectedOptions = $.extend(ko.bindingHandlers.selectedOptions,
    // Adds support for the selectedOptions binding to the CheckBoxList control.
    {
        // Responsible for setting up a click listener on each input in the list control that propogates any 
        // selection back to the view model
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var selectedOptionsObservable = valueAccessor();
            var control = $(element);
            
            // Add a on click handler here for pushing selected values to an array.
            if (isCheckBoxListControl(element)) {
                ko.utils.registerEventHandler
                
                control.delegate('input', 'click', function(e) {
                    // Retrieve the current value and checked state of the input that has been clicked.
                    var input = $(this);
                    var value = $(this).attr("value");
                    var isChecked = input.attr("checked");
                    var selectedOptionsValue = ko.utils.unwrapObservable(selectedOptionsObservable);
                    
                    if(!(selectedOptionsValue instanceof Array))
                        throw new 'Bound selectedOptions observable is not an array.'

                    // If the input has been checked on, then push the value of the input to the selectedOptions array if it doesn't already exist.
                    if(isChecked && selectedOptionsObservable.indexOf(value) === -1 )
                        selectedOptionsObservable(getSelectedInputValues(element));
                    else
                        // If the input has been checked off, remove the value from the selectedOptions array.
                        ko.utils.arrayRemoveItem(selectedOptionsObservable, value);

                    // Prevent the click event from bubbling up through the DOM.  This is important because when this click event handler is finished,
                    // other handlers after this one will execute.  If the input that invoked this handler is deleted in the "options" binding, then
                    // this may cause havock with other javascript libraries.  In particular, not calling stopPropagation() here will cause issues with
                    // jQuery validation when the library goes searching for the form the input belongs to after the input has been deleted.
                    e.stopPropagation();
                });
            } else if (!isPlaceholder(element) && !isListControl(element)) {
                selectedOptionsInit(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
            }
        },
        // Responsible for propogating any selection changes in the view model back to the list control
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var selectedOptionsObservable = valueAccessor();
            var control = $(element);
            
            // Set the selections of the check / radio list control here...
            if (isCheckBoxListControl(element)) {
                var selectedOptionsValue = ko.utils.unwrapObservable(selectedOptionsObservable);

                // Reset all checkboxes to unchecked.
                var inputs = control.find('input');
                inputs.attr('checked', false);

                // Return if we're dealing with a null or non Array observable here.
                if(!(selectedOptionsValue instanceof Array))
                    return;

                // Apply selected values to control.
                selectInputs(control, selectedOptionsValue);

            } else if (!isPlaceholder(element) && !isListControl(element)) {
                selectedOptionsUpdate(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
            }
        }
    });

    ko.bindingHandlers.options = $.extend(ko.bindingHandlers.options,
    // Adds support for the Options binding to provide options for selection in the RadioButtonList and CheckBoxList controls.
    {
        // Responsible for replacing the placeholder input control with a DIV that forms the basis for the List control.
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            
            var optionsObservable = valueAccessor();
            
            // If the bound element is the placeholder control...
            if(isPlaceholder(element))
            {
                var jqElement = $(element);
                var id = jqElement.attr("id");
                var name = jqElement.attr("name");
                var type = jqElement.attr("type");
                var css = (type == "checkbox" ? checkListCss : radioListCss);
                
                // Create a new control that will form the actual checkbox / radio list control.
                var control = $("<div></div>");
                // Copy attributes across from the placeholder to the actual control.
                copyAttributes(jqElement, control);
                control.addClass(css);
                // Replace the placeholder control with the actual control.
                jqElement.replaceWith(control);
                // Clean jquery element of all jquery events, etc.
                jqElement.remove();
                // Unregister placeholder with knockout.
                ko.cleanNode(element);
                
                ko.applyBindingsToNode(control[0], allBindingsAccessor(), bindingContext.$data);
            }
        },
        // Responsible for updating the CheckBoxList and RadioButtonList control with new check box or radio button items when the options
        // for the control changes.
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var allBindings = allBindingsAccessor();
            var optionsObservable = valueAccessor();
            v