QUnit.testStart(function() {
    var markup =
'<div>\
    <div id="container" class="dx-datagrid"></div>\
</div>';

    $("#qunit-fixture").html(markup);
});

import "common.css!";

import "ui/data_grid/ui.data_grid";
import "data/odata/store";

import $ from "jquery";
import eventUtils from "events/utils";
import ArrayStore from "data/array_store";
import pointerEvents from "events/pointer";
import { setupDataGridModules, generateItems } from "../../helpers/dataGridMocks.js";
import { DataGridWrapper } from "../../helpers/wrappers/dataGridWrappers.js";

var CLICK_EVENT = eventUtils.addNamespace(pointerEvents.up, "dxDataGridKeyboardNavigation"),
    dataGridWrapper = new DataGridWrapper("#container");

var addOptionChangedHandlers = function(that) {
    that.optionCalled.add(function(optionName, value) {
        if(optionName === "focusedRowIndex" ||
           optionName === "focusedRowKey" ||
           optionName === "focusedColumnIndex" ||
           optionName === "skipFocusedRowNavigation") {
            that.focusController.optionChanged({ name: optionName, value: value });
        }
    });
};

var KEYS = {
    "tab": "Tab",
    "enter": "Enter",
    "escape": "Escape",
    "pageUp": "PageUp",
    "pageDown": "PageDown",
    "leftArrow": "ArrowLeft",
    "upArrow": "ArrowUp",
    "rightArrow": "ArrowRight",
    "downArrow": "ArrowDown",
    "space": " ",
    "F": "F",
    "A": "A"
};

function triggerKeyDown(key, ctrl, shift, target, result) {
    result = result || {
        preventDefault: false,
        stopPropagation: false
    };
    var alt = false;
    if(typeof ctrl === "object") {
        alt = ctrl.alt;
        shift = ctrl.shift;
        ctrl = ctrl.ctrl;
    }
    this.keyboardNavigationController._keyDownProcessor.process({
        key: KEYS[key],
        keyName: key,
        ctrlKey: ctrl,
        shiftKey: shift,
        altKey: alt,
        target: target && target[0] || target,
        preventDefault: function() {
            result.preventDefault = true;
        },
        isDefaultPrevented: function() {
            return result.preventDefault;
        },
        stopPropagation: function() {
            result.stopPropagation = true;
        }
    });

    return result;
}

QUnit.module("FocusedRow with real dataController and columnsController", {
    setupModule: function() {
        this.triggerKeyDown = triggerKeyDown;
        this.data = this.data || [
            { name: "Alex", phone: "555555", room: 1 },
            { name: "Dan", phone: "553355", room: 2 }
        ];

        this.columns = this.columns || ["name", "phone", "room"];

        this.options = $.extend(true, {
            keyboardNavigation: {
                enabled: true
            },
            tabIndex: 0,
            showColumnHeaders: true,
            commonColumnSettings: {
                allowEditing: true
            },
            columns: this.columns,
            dataSource: this.data,
            useLegacyKeyboardNavigation: true
        }, this.options);

        setupDataGridModules(this, [
            "data", "columns", "columnHeaders", "rows", "editorFactory", "grouping", "gridView", "editing", "focus", "selection",
            "keyboardNavigation", "validating", "masterDetail", "virtualScrolling", "adaptivity", "columnFixing"
        ], {
            initViews: true
        });
    },
    beforeEach: function() {
        this.clock = sinon.useFakeTimers();
    },
    afterEach: function() {
        this.clock.restore();
        this.dispose();
    }
});

QUnit.testInActiveWindow("FocusedRow should present if set focusedRowIndex", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true,
        focusedRowIndex: 1
    };

    this.setupModule();

    // act
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.notOk($(rowsView.getRow(0)).hasClass("dx-row-focused"), "Row 0 has no focus");
    assert.ok($(rowsView.getRow(1)).hasClass("dx-row-focused"), "Row 1 has focus");
    assert.equal(rowsView.element().find(".dx-datagrid-focus-overlay").length, 0, "Has no focused cell overlay");
});

QUnit.testInActiveWindow("TabIndex should set for the [focusedRowIndex; focusedColumnIndex] cell", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowIndex: 1,
        focusedColumnIndex: 2,
        tabIndex: 0
    };

    this.setupModule();

    // act
    this.gridView.render($("#container"));

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(rowsView.getRow(0).attr("tabindex"), undefined, "Row 0 tabIndex");
    assert.equal(rowsView.getRow(1).find("td").eq(2).attr("tabindex"), 0, "TabIndex set for the cell(1,2)");
});

QUnit.testInActiveWindow("Arrow Up key should decrease focusedRowIndex", function(assert) {
    var rowsView,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowIndex: 1,
        focusedColumnIndex: 2
    };
    this.setupModule();
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex is 1");
    // act
    keyboardController._upDownKeysHandler({ key: "ArrowUp", keyName: "upArrow" });
    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex is 0");
});

QUnit.testInActiveWindow("Arrow keys should move focused row if columnHidingEnabled is true", function(assert) {
    var rowsView,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        focusedRowEnabled: true,
        columnHidingEnabled: true,
        keyExpr: "name",
        focusedRowIndex: 1
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex is 1");
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "FocusedRow");
    // act
    $(this.getCellElement(1, 0)).trigger(pointerEvents.up).click();
    keyboardController._upDownKeysHandler({ key: "ArrowUp", keyName: "upArrow" });
    this.clock.tick();
    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex is 0");
    assert.ok(rowsView.getRow(0).hasClass("dx-row-focused"), "FocusedRow");
});

QUnit.testInActiveWindow("Handle arrow keys without focused cell if focusedRowIndex and columnHidingEnabled is true", function(assert) {
    var rowsView,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        focusedRowEnabled: true,
        columnHidingEnabled: true,
        focusedRowIndex: 1,
        keyExpr: "name"
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    try {
        // act
        keyboardController._upDownKeysHandler({ key: "ArrowUp", keyName: "upArrow" });
        this.clock.tick();
        // assert
        assert.ok(true, "No exception");
    } catch(e) {
        // assert
        assert.ok(false, e.message);
    }
});

QUnit.testInActiveWindow("Arrow Down key should increase focusedRowIndex", function(assert) {
    var rowsView,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        focusedRowIndex: 0,
        focusedColumnIndex: 2
    };
    this.setupModule();
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;
    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex is 0");
    // act
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex is 1");
});

QUnit.testInActiveWindow("Click by cell should focus the row", function(assert) {
    var rowsView,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true
    };
    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    assert.equal(rowsView.getRow(0).attr("tabindex"), 0, "Tabindex row 0");
    assert.notOk(rowsView.getRow(0).hasClass("dx-cell-focus-disabled"), "Row 0 has no .dx-cell-focus-disabled");

    // act
    $(rowsView.getCellElement(1, 0)).trigger(CLICK_EVENT).click();
    // assert
    assert.ok(keyboardController.isRowFocusType(), "Row focus type");
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex = 1");
    assert.equal(rowsView.getRow(0).attr("tabindex"), undefined, "Row 0 tabindex");
    assert.notOk(rowsView.getRow(0).hasClass("dx-cell-focus-disabled"), "Row 0 has no .dx-cell-focus-disabled");
    assert.equal(rowsView.getRow(1).attr("tabindex"), 0, "Row 1 tabindex");
    assert.ok(rowsView.getRow(1).hasClass("dx-cell-focus-disabled"), "Row 1 has .dx-cell-focus-disabled");
    assert.equal($(rowsView.getCellElement(1, 0)).attr("tabindex"), undefined);

    // act
    $(rowsView.getCellElement(0, 0)).trigger(CLICK_EVENT).click();
    rowsView = this.gridView.getView("rowsView");
    // assert
    assert.ok(keyboardController.isRowFocusType(), "Row focus type");
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex = 0");
    assert.equal(rowsView.getRow(0).attr("tabindex"), 0, "Row 0 tabindex");
    assert.ok(rowsView.getRow(0).hasClass("dx-cell-focus-disabled"), "Row 0 has .dx-cell-focus-disabled");

    assert.equal($(rowsView.getCellElement(0, 0)).attr("tabindex"), undefined);
    assert.equal(rowsView.getRow(1).attr("tabindex"), undefined, "Row 1 tabindex");
    assert.notOk(rowsView.getRow(1).hasClass("dx-cell-focus-disabled"), "Row 1 has no .dx-cell-focus-disabled");
});

QUnit.testInActiveWindow("Tab key should focus the cell", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        }
    };
    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    this.clock.tick();
    // act
    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.triggerKeyDown("tab", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "focusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "focusedColumnIndex");
    assert.equal(rowsView.getRow(0).attr("tabindex"), undefined, "Row 0 tabindex");
    assert.equal(rowsView.getRow(1).attr("tabindex"), 0, "Row 1 tabindex");
    assert.equal(rowsView.getRow(1).find("td").eq(0).attr("tabindex"), undefined, "Cell 0 tabindex");
    assert.equal(rowsView.getRow(1).find("td").eq(1).attr("tabindex"), 0, "Cell 1 tabindex");
});

QUnit.testInActiveWindow("Tab key before grid should focus the first row (legacyKbn)", function(assert) {
    var that = this,
        rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        selection: {
            mode: "multiple"
        },
        useLegacyKeyboardNavigation: true
    };
    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    // act
    $('#container [tabindex="0"]').first().trigger("focus").trigger("focusin");
    this.clock.tick();
    // assert
    assert.equal(that.option("focusedRowIndex"), 0, "focusedRowIndex");
    assert.equal(rowsView.getRow(0).attr("tabindex"), 0, "Row 0 tabindex");
    assert.ok(rowsView.getRow(0).hasClass("dx-row-focused"), "Row 0 has row focused class");
});

QUnit.testInActiveWindow("onSelectionChanged event should fire if focusedRowEnabled (T729611)", function(assert) {
    var selectionChangedFiresCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        selection: {
            mode: "single"
        },
        onSelectionChanged: () => ++selectionChangedFiresCount
    };
    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    $(this.getCellElement(1, 1)).focus().trigger("dxclick");
    this.clock.tick();

    // assert
    assert.equal(selectionChangedFiresCount, 1, "selectionChangedFiresCount");
});

QUnit.testInActiveWindow("Tab key press should work correctly on new row if focusedRowEnabled (T803763)", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        editing: {
            allowAdding: true,
            mode: 'cell'
        },
        focusedRowEnabled: true
    };
    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();
    this.addRow();
    this.clock.tick();

    // act
    this.triggerKeyDown("tab", false, false, $(this.getCellElement(0, 0)));

    // assert
    var keyboardController = this.getController("keyboardNavigation");
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 0, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "Focused column index");
});

QUnit.testInActiveWindow("Tab key before rows view should focus the first row", function(assert) {
    var that = this,
        rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        selection: {
            mode: "multiple"
        }
    };
    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    // act
    $('.dx-datagrid-rowsview [tabindex="0"]').first().trigger("focus").trigger("focusin");
    this.clock.tick();
    // assert
    assert.equal(that.option("focusedRowIndex"), 0, "focusedRowIndex");
    assert.equal(rowsView.getRow(0).attr("tabindex"), 0, "Row 0 tabindex");
    assert.ok(rowsView.getRow(0).hasClass("dx-row-focused"), "Row 0 has row focused class");
});

QUnit.testInActiveWindow("LeftArrow key should focus the cell", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        }
    };
    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    this.clock.tick();
    // act
    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.triggerKeyDown("leftArrow", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex = 1");
    assert.equal(this.option("focusedColumnIndex"), 0, "FocusedColumnIndex = 0");
    assert.equal(rowsView.getRow(0).attr("tabindex"), undefined);
    assert.equal(rowsView.getRow(1).attr("tabindex"), 0);
    assert.equal(rowsView.getRow(1).find("td").eq(0).attr("tabindex"), 0);
    assert.equal(rowsView.getRow(1).find("td").eq(1).attr("tabindex"), undefined);
});

QUnit.testInActiveWindow("RightArrow key should focus the cell", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        }
    };
    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    this.clock.tick();
    // act
    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.triggerKeyDown("rightArrow", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex = 1");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex = 1");
    assert.equal(rowsView.getRow(0).attr("tabindex"), undefined, "Row 0 has no tabindex");
    assert.equal(rowsView.getRow(1).attr("tabindex"), 0, "Row 1 has tabindex");
    assert.equal(rowsView.getRow(1).find("td").eq(0).attr("tabindex"), undefined, "Cell[1,0] has no tabindex");
    assert.equal(rowsView.getRow(1).find("td").eq(1).attr("tabindex"), 0, "Cell[1,1] has tabindex");
});

QUnit.testInActiveWindow("ArrowUp / ArrowDown should not change focus type", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true
    };

    this.data = [
        { name: "Alex", phone: "555555", room: 1 },
        { name: "Dan", phone: "553355", room: 2 },
        { name: "Ben", phone: "6666666", room: 3 }
    ];

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();
    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex");

    // act
    $(rowsView.getCellElement(1, 0)).trigger(CLICK_EVENT).click();
    // assert
    assert.ok(this.keyboardNavigationController.isRowFocusType(), "Row focus type");

    // act
    this.triggerKeyDown("upArrow", false, false, $(rowsView.getCellElement(1, 0)));
    this.clock.tick();
    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex");
    assert.ok(this.keyboardNavigationController.isRowFocusType(), "Row focus type");

    // act
    this.triggerKeyDown("downArrow", false, false, $(rowsView.getCellElement(0, 0)));
    this.clock.tick();
    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex");
    assert.ok(this.keyboardNavigationController.isRowFocusType(), "Row focus type");
});

QUnit.testInActiveWindow("Focus row by click if virtual scrolling mode", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        },
        scrolling: {
            mode: "virtual"
        },
        paging: {
            pageSize: 2,
            pageIndex: 2
        }
    };

    this.data = [
        { name: "Alex", phone: "555555", room: 1 },
        { name: "Dan", phone: "553355", room: 2 },
        { name: "Ben", phone: "6666666", room: 3 },
        { name: "Mark1", phone: "777777", room: 4 },
        { name: "Mark2", phone: "888888", room: 5 },
        { name: "Mark3", phone: "99999999", room: 6 }
    ];

    this.setupModule();

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    // act
    $(rowsView.getCellElement(1, 0)).trigger(CLICK_EVENT).click();
    // assert
    assert.equal(this.option("focusedRowIndex"), 3, "FocusedRowIndex = 3");
    assert.ok(this.keyboardNavigationController.isRowFocusType(), "Row focus type");
});

QUnit.testInActiveWindow("Focus row if virtual scrolling mode", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowIndex: 4,
        editing: {
            allowEditing: false
        },
        scrolling: {
            mode: "virtual"
        },
        paging: {
            pageSize: 2,
            pageIndex: 2
        }
    };

    this.data = [
        { name: "Alex", phone: "555555", room: 1 },
        { name: "Dan", phone: "553355", room: 2 },
        { name: "Ben", phone: "6666666", room: 3 },
        { name: "Mark1", phone: "777777", room: 4 },
        { name: "Test", phone: "888888", room: 5 },
        { name: "Mark3", phone: "99999999", room: 6 }
    ];

    this.setupModule();

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex = 4");
    assert.equal($(rowsView.getRow(2)).find("td").eq(0).text(), "Test", "Focused row ");
});

QUnit.testInActiveWindow("Focus row if virtual scrolling and index is on the not loaded page", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        height: 40,
        focusedRowEnabled: true,
        focusedRowIndex: 3,
        keyExpr: "name",
        showColumnHeaders: false,
        scrolling: {
            mode: "virtual",
            removeInvisiblePages: true
        },
        paging: {
            pageSize: 1
        }
    };

    this.data = [
        { name: "Alex", phone: "555555", room: 1 },
        { name: "Ben", phone: "553355", room: 2 },
        { name: "Dan", phone: "6666666", room: 3 },
        { name: "Mark1", phone: "777777", room: 4 },
        { name: "Mark3", phone: "888888", room: 5 }
    ];

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), 3, "focusedRowIndex");
    assert.equal(this.option("focusedRowKey"), "Mark1", "focusedRowKey");
    assert.ok(rowsView.getRow(0).hasClass("dx-row-focused"), "Focused row");
    assert.equal($(rowsView.getRow(0)).find("td").eq(0).text(), "Mark1", "Focused row cell text");
});

QUnit.testInActiveWindow("DataGrid should show error E1042 if keyExpr is absent and focusedRowEnabled when focusedRowKey is set", function(assert) {
    var dataErrors = [];

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true,
        focusedRowKey: "Den",
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.setupModule();

    this.getController("data").dataErrorOccurred.add(function(e) {
        dataErrors.push(e);
    });

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));


    this.clock.tick();

    // assert
    assert.equal(dataErrors.length, 1, "One error");
    assert.ok(dataErrors[0].message.indexOf("E1042 - Row focusing requires the key field to be specified") !== -1, "E1042 text");
});

QUnit.testInActiveWindow("DataGrid should show error E1042 if keyExpr is missing and focusedRowEnabled", function(assert) {
    var dataErrors = [];

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.setupModule();

    this.getController("data").dataErrorOccurred.add(function(e) {
        dataErrors.push(e);
    });

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    // act
    this.option("focusedRowKey", "Dan");

    this.clock.tick();

    // assert
    assert.equal(dataErrors.length, 1, "One error");
    assert.ok(dataErrors[0].message.indexOf("E1042") !== -1, "E1042");
});

QUnit.testInActiveWindow("DataGrid should not show error E1042 if keyExpr is missing and focusedRowEnabled is false", function(assert) {
    var dataErrors = [];

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: false
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.setupModule();

    this.getController("data").dataErrorOccurred.add(function(e) {
        dataErrors.push(e);
    });

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    // act
    this.option("focusedRowKey", "Dan");

    this.clock.tick();

    // assert
    assert.equal(dataErrors.length, 0, "No error");
});

QUnit.testInActiveWindow("DataGrid should not show error E4024 if keyExpr and store are absent", function(assert) {
    var dataErrors = [];

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true,
        focusedRowKey: "Key"
    };

    this.setupModule();

    this.getController("data").store = function() {
    };

    this.getController("data").dataErrorOccurred.add(function(e) {
        dataErrors.push(e);
    });

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    // act
    this.clock.tick();

    // assert
    assert.equal(dataErrors.length, 0, "No error");
});

QUnit.testInActiveWindow("Focus row if grouping and virtual scrolling mode", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        height: 140,
        focusedRowEnabled: true,
        focusedRowKey: "Clark",
        scrolling: {
            mode: "virtual"
        },
        paging: {
            pageSize: 3
        },
        columns: [
            { dataField: "team", groupIndex: 0, autoExpandGroup: true },
            "name",
            "age"
        ]
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal', name: 'Sad', age: 28 },
        { team: 'internal', name: 'Mark', age: 25 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'internal1', name: 'Clark', age: 22 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), 9, "FocusedRowIndex");
    assert.equal(this.pageIndex(), 3, "PageIndex");
    assert.equal($(rowsView.getRow(0)).find("td").eq(1).text(), "Clark", "Clark");
});

QUnit.test("Focus next row if grouping and virtual scrolling mode", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        height: 140,
        focusedRowEnabled: true,
        focusedRowKey: "Den",
        scrolling: {
            mode: "virtual"
        },
        paging: {
            pageSize: 3
        },
        columns: [
            { dataField: "team", groupIndex: 0, autoExpandGroup: true },
            "name",
            "age"
        ]
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal', name: 'Sad', age: 28 },
        { team: 'internal', name: 'Mark', age: 25 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'internal1', name: 'Clark', age: 22 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.setupModule();

    addOptionChangedHandlers(this);

    rowsView = this.gridView.getView("rowsView");

    this.gridView.render($("#container"));
    rowsView.height(140);
    rowsView.resize();
    this.clock.tick();

    // assert
    assert.equal(this.option("focusedRowIndex"), 6, "FocusedRowIndex");

    this.navigateToRow("Alice");
    this.clock.tick();

    // assert
    assert.equal(this.option("focusedRowIndex"), 6, "FocusedRowIndex");
    assert.equal(this.option("focusedRowKey"), "Den", "FocusedRowKey");
    assert.equal(this.pageIndex(), 3, "PageIndex");
    assert.equal($(rowsView.getCellElement(11, 1)).text(), "Alice");
    assert.ok(dataGridWrapper.rowsView.isRowVisible(11));
});

QUnit.testInActiveWindow("DataGrid should focus row by focusedRowIndex if data was filtered", function(assert) {
    var rowsView,
        visibleRows,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 0,
        columns: ["team", "name", "age"]
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    // act
    this.dataController.filter("team", "=", "public");
    this.dataController.load();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    visibleRows = this.dataController.getVisibleRows();
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;
    keyboardController.focus(rowsView.getRow(0).children("td").eq(0));

    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "focusedRowIndex");
    assert.ok(rowsView.getRow(0).hasClass("dx-row-focused"), "row 0 is focused");
    assert.equal(visibleRows.length, 2, "visible rows count");
    assert.equal(visibleRows[0].key, "Alice", "row 0");
});

QUnit.testInActiveWindow("DataGrid should focus the row by focusedRowKey if row key present in data after filter", function(assert) {
    var rowsView,
        visibleRows;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 3,
        columns: ["team", "name", "age"]
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    // assert
    assert.equal(this.option("focusedRowIndex"), 3, "focusedRowIndex");
    assert.equal(this.option("focusedRowKey"), "Den", "focusedRowKey");

    // act
    this.dataController.filter("team", "=", "internal0");
    this.dataController.load();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    visibleRows = this.dataController.getVisibleRows();

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "focusedRowIndex");
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "row 1 is focused");
    assert.equal(visibleRows.length, 2, "visible rows count");
    assert.equal(visibleRows[1].key, "Den", "row 1 data");
});

QUnit.testInActiveWindow("DataGrid should restore focused row when data without focused row was filtered", function(assert) {
    var rowsView,
        visibleRows;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        columns: ["team", "name", "age"]
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    $(this.getCellElement(5, 0)).trigger(pointerEvents.up).focus();

    // act
    this.dataController.filter("team", "=", "public");
    this.dataController.load();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    visibleRows = this.dataController.getVisibleRows();

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "focusedRowIndex");
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "row 1 is focused");
    assert.equal(visibleRows.length, 2, "visible rows count");
    assert.equal(visibleRows[1].key, "Zeb", "row 1");
});

QUnit.testInActiveWindow("DataGrid should restore focused row when focused row data was filtered", function(assert) {
    var rowsView,
        visibleRows;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        columns: ["team", "name", "age"]
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    $(this.getCellElement(5, 0)).trigger(pointerEvents.up).focus();

    // act
    this.dataController.filter("team", "=", "internal");
    this.dataController.load();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    visibleRows = this.dataController.getVisibleRows();

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "focusedRowIndex");
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "row 1 is focused");
    assert.equal(visibleRows.length, 2, "visible rows count");
});

QUnit.testInActiveWindow("DataGrid should focus the corresponding group row if group collapsed and inner data row was focused", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Dan",
        columns: [
            { dataField: "team", groupIndex: 0, autoExpandGroup: true },
            "name",
            "age"
        ]
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.getVisibleRows()[3].rowType, "group", "group row");

    // act
    this.collapseRow(["internal0"]);

    this.clock.tick();

    // assert
    assert.equal(this.getVisibleRows().length, 7, "visible rows count");
    assert.equal(this.getVisibleRows()[3].rowType, "group", "group row");
    assert.equal(this.getVisibleRows()[4].rowType, "group", "group row");
    assert.equal(this.getVisibleRows()[3].isExpanded, false, "group collapsed");
    assert.equal(rowsView.getRow(3).hasClass("dx-row-focused"), true, "group row was focused");
});

QUnit.testInActiveWindow("DataGrid should focus the corresponding group row if group collapsed and inner data row was focused if calculateGroupValue is used", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Dan",
        columns: [
            { calculateGroupValue: "team", groupIndex: 0, autoExpandGroup: true, name: "test" },
            "name",
            "age"
        ]
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.getVisibleRows()[3].rowType, "group", "group row");

    // act
    this.collapseRow(["internal0"]);

    this.clock.tick();

    // assert
    assert.equal(this.getVisibleRows().length, 7, "visible rows count");
    assert.equal(this.getVisibleRows()[3].rowType, "group", "group row");
    assert.equal(this.getVisibleRows()[4].rowType, "group", "group row");
    assert.equal(this.getVisibleRows()[3].isExpanded, false, "group collapsed");
    assert.equal(rowsView.getRow(3).hasClass("dx-row-focused"), true, "group row was focused");
});

QUnit.testInActiveWindow("Tab index should not exist for the previous focused row", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true,
        focusedRowIndex: 0,
        editing: {
            allowEditing: false
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // act
    $(rowsView.getRow(0).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();
    this.triggerKeyDown("rightArrow", false, false, rowsView.element().find(":focus").get(0));
    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    // assert
    assert.equal($(rowsView.getRow(0)).find('[tabindex="0"]').length, 1, "Row 0 has tabindex");
    // act
    this.getController("focus")._clearPreviousFocusedRow($(rowsView.getRow(0).parent()));
    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex = 1");
    assert.equal($(rowsView.getRow(0)).find('[tabindex="0"]').length, 0, "Row 0 has no tabindex");
    assert.equal($(rowsView.getRow(1)).find('[tabindex="0"]').length, 0, "Row 1 has no tabindex");
});

QUnit.testInActiveWindow("Set focusedRowIndex, focusedColumnIndex should focus the cell", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowIndex: 1,
        focusedColumnIndex: 2,
        editing: {
            allowEditing: false
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "FocusedRowIndex = 1");
    assert.equal(this.option("focusedColumnIndex"), 2, "focusedColumnIndex = 2");
    assert.equal(rowsView.getRow(1).children("td:nth-child(3)").attr("tabindex"), 0, "Cell[2;1] has tabindex=0");
});

QUnit.test("Focus types test", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        editing: {
            allowEditing: false,
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // assert
    assert.ok(this.getController("keyboardNavigation").isCellFocusType(), "Cell focus type");
    // act
    this.getController("keyboardNavigation").setRowFocusType();
    // assert
    assert.ok(this.getController("keyboardNavigation").isCellFocusType(), "Cell focus type");
    assert.notOk(this.getController("keyboardNavigation").isRowFocusType(), "Row focus type");
    // act
    this.option("focusedRowEnabled", true);
    this.getController("keyboardNavigation").setRowFocusType();
    // assert
    assert.notOk(this.getController("keyboardNavigation").isCellFocusType(), "Not cell focus type");
    assert.ok(this.getController("keyboardNavigation").isRowFocusType(), "Row focus type");
});

QUnit.testInActiveWindow("Escape should change focus type from cell to row if focusedRowEnabled", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        }
    };
    this.setupModule();
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    this.clock.tick();
    // act
    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.triggerKeyDown("rightArrow", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.ok(this.getController("keyboardNavigation").isCellFocusType(), "Cell focus type");
    // act
    this.triggerKeyDown("escape", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.ok(this.getController("keyboardNavigation").isRowFocusType(), "Row focus type");
});

QUnit.testInActiveWindow("Escape should not change focus type from cell to row if not focusedRowEnabled", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.options = {
        editing: {
            allowEditing: false
        }
    };
    this.setupModule();
    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    // assert
    assert.equal(this.option("focusedRowIndex"), undefined, "FocusedRowIndex is undefined");
    this.clock.tick();
    // act
    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.triggerKeyDown("rightArrow", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.ok(this.getController("keyboardNavigation").isCellFocusType(), "Cell focus type");
    // act
    this.triggerKeyDown("escape", false, false, rowsView.element().find(":focus").get(0));
    // assert
    assert.ok(this.getController("keyboardNavigation").isCellFocusType(), "Row focus type");
});

QUnit.testInActiveWindow("Focused row different key support", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };
    this.setupModule();

    this.option("focusedRowKey", { key0: "1", key1: "2" });
    assert.ok(this.getController("focus").isRowFocused({ key0: "1", key1: "2" }), "Composite key equal");
    assert.notOk(this.getController("focus").isRowFocused({ key0: "4", key1: "2" }), "Composite key not equal");

    this.option("focusedRowKey", 123);
    assert.ok(this.getController("focus").isRowFocused(123), "Simple key equal");
    assert.notOk(this.getController("focus").isRowFocused(11), "Simple key not equal");

    this.option("focusedRowKey", "TestKey");
    assert.ok(this.getController("focus").isRowFocused("TestKey"), "Simple key equal");
    assert.notOk(this.getController("focus").isRowFocused("TestKey1"), "Simple key not equal");
});

QUnit.testInActiveWindow("Focused row index should preserve after paging operation", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Ben", phone: "333333", room: 5 },
        { name: "Dan", phone: "2222222", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1,
        paging: {
            pageSize: 2
        },
        editing: {
            allowEditing: false
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    // assert
    assert.equal(this.pageIndex(), 0, "PageIndex is 0");
    assert.strictEqual(this.dataController.getVisibleRows()[1].data, this.data[1], "Row 0, Data 1");
    assert.ok(this.gridView.getView("rowsView").getRow(1).hasClass("dx-row-focused"), "Row 1 is the focused row");
    // act
    this.dataController.pageIndex(1);
    // assert
    assert.strictEqual(this.dataController.getVisibleRows()[1].data, this.data[3], "Row 1, Data 3");
    assert.equal(this.pageIndex(), 1, "PageIndex is 1");
    assert.ok(this.gridView.getView("rowsView").getRow(1).hasClass("dx-row-focused"), "Row 1 is the focused row");
});

QUnit.testInActiveWindow("Page with focused row should loads after sorting", function(assert) {
    var $rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1,
        paging: {
            pageSize: 2
        },
        sorting: {
            mode: "single"
        },
        editing: {
            allowEditing: false
        },
        columns: [
            { dataField: "name" },
            "phone",
            { dataField: "room", allowSorting: true }
        ]
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $rowsView = $(this.gridView.getView("rowsView").element());

    // assert
    assert.equal(this.pageIndex(), 0, "PageIndex is 0");
    assert.strictEqual(this.dataController.getVisibleRows()[1].data, this.data[1], "Focused row data is on the page");
    assert.equal($rowsView.find(".dx-row-focused > td:nth-child(1)").text(), "Dan", "Focused row key column text");

    // act
    this.getController("columns").changeSortOrder(2, "asc");
    this.clock.tick();
    // assert
    $rowsView = $(this.gridView.getView("rowsView").element());
    var focusedRowIndex = this.option("focusedRowIndex");
    assert.equal(this.pageIndex(), 2, "PageIndex");
    assert.strictEqual(this.dataController.getVisibleRows()[focusedRowIndex].data, this.data[1], "Focused row data is on the page");
    assert.equal($rowsView.find(".dx-row-focused > td:nth-child(1)").text(), "Dan", "Focused row key column text");
});

// T755462
QUnit.testInActiveWindow("The page with focused row should load without errors after sorting the boolean column", function(assert) {
    // arrange
    var focusedRowIndex;

    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", isRoom: true },
        { name: "Dan", phone: "2222222", isRoom: true },
        { name: "Ben", phone: "333333", isRoom: true },
        { name: "Sean", phone: "4545454", isRoom: true },
        { name: "Smith", phone: "555555", isRoom: false },
        { name: "Zeb", phone: "6666666", isRoom: false }
    ];

    var store = new ArrayStore(this.data),
        loadSpy = sinon.spy((loadOptions) => store.load(loadOptions));

    this.options = {
        focusedRowEnabled: true,
        focusedRowIndex: 0,
        paging: {
            pageSize: 2
        },
        sorting: {
            mode: "single"
        },
        columns: [
            "name", "phone",
            { dataField: "isRoom", allowSorting: true, dataType: "boolean" }
        ],
        scrolling: {
            mode: "virtual",
            rowRenderingMode: "virtual"
        },
        remoteOperations: true,
        dataSource: {
            load: loadSpy,
            key: "name",
            totalCount: function(options) {
                return store.totalCount(options);
            }
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    loadSpy.reset();
    this.getController("columns").changeSortOrder(2, "asc");
    this.clock.tick();

    // assert
    focusedRowIndex = this.option("focusedRowIndex");
    assert.strictEqual(this.pageIndex(), 1, "pageIndex");
    assert.strictEqual(this.dataController.getVisibleRows()[focusedRowIndex].data, this.data[0], "Focused row data is on the page");

    // loadSpy.getCall(0) - load first page
    // loadSpy.getCall(1) - load second page
    // loadSpy.getCall(2) - load focused row
    assert.deepEqual(loadSpy.getCall(3).args[0].filter, [
        ["isRoom", "<>", true], "or", [
            ["isRoom", "=", true ], "and", [
                ["name", "<", "Alex"], "or", [
                    ["name", "=", "Alex"], "and", ["name", "<", "Alex" ]
                ]
            ]
        ]
    ]); // load data before a focused row
});

QUnit.testInActiveWindow("DataGrid - Should paginate to the defined focusedRowKey", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        paging: {
            pageSize: 2
        },
        editing: {
            allowEditing: false
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // assert
    assert.equal(this.pageIndex(), 2, "PageIndex is 0");
    assert.strictEqual(this.dataController.getVisibleRows()[0].data, this.data[4], "Row 0, Data 4");
    assert.ok(this.gridView.getView("rowsView").getRow(0).hasClass("dx-row-focused"), "Row 0 is the focused row");
});

QUnit.testInActiveWindow("Highlight cell on focus()", function(assert) {
    var focusedCellChangingCount = 0,
        keyboardController;
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowIndex: 1,
        focusedColumnIndex: 1,
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
            e.isHighlighted = true;
            assert.equal(e.event, null, "no event");
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.getView("rowsView");
    keyboardController.focus(null);
    this.clock.tick();

    // assert
    assert.equal(focusedCellChangingCount, 1, "onFocusedCellChanging fires count");
    assert.ok($("#container .dx-datagrid-focus-overlay:visible").length, "has focus overlay");
});

QUnit.testInActiveWindow("Highlight cell on focus() if focusedRowIndex, focusedColumnIndex are not set", function(assert) {
    var focusedCellChangingCount = 0,
        keyboardController;
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.getView("rowsView");
    keyboardController.focus();
    this.clock.tick();

    // assert
    assert.equal(focusedCellChangingCount, 1, "onFocusedCellChanging fires count");
    assert.notOk($("#container .dx-datagrid-focus-overlay:visible").length, "has no focus overlay");
});

QUnit.testInActiveWindow("Highlight cell on focus() if focusedRowEnabled is true and focusedColumnIndex, focusedRowIndex are set", function(assert) {
    var focusedCellChangingCount = 0,
        keyboardController;
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowIndex: 1,
        focusedColumnIndex: 1,
        focusedRowEnabled: true,
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
            e.isHighlighted = true;
            assert.equal(e.event, null, "no event");
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.getView("rowsView");
    keyboardController.focus(null);
    this.clock.tick();

    // assert
    assert.equal(focusedCellChangingCount, 0, "No focusedCellChanging event");
    assert.notOk($("#container .dx-datagrid-focus-overlay:visible").length, "has no focus overlay");
});

QUnit.testInActiveWindow("Not highlight cell on focus() if focusedRowEnabled is true and focusedColumnIndex is not set", function(assert) {
    var focusedCellChangingCount = 0,
        keyboardController;
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        focusedRowEnabled: true,
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.getView("rowsView");
    keyboardController.focus(null);
    this.clock.tick();

    // assert
    assert.equal(focusedCellChangingCount, 0, "onFocusedCellChanging fires count");
    assert.notOk($("#container .dx-datagrid-focus-overlay:visible").length, "has no focus overlay");
});

QUnit.testInActiveWindow("Group row should focused on focus()", function(assert) {
    var keyboardController,
        focusedCellChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        columns: [
            { dataField: "team", groupIndex: 0, autoExpandGroup: true },
            "name",
            "age"
        ],
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.getView("rowsView");
    keyboardController.focus(null);
    this.clock.tick(500);

    // assert
    assert.equal(focusedCellChangingCount, 1, "onFocusedCellChanging fires count");
    assert.notOk($("#container .dx-datagrid-focus-overlay:visible").length, "has no focus overlay");
    assert.ok(this.getView("rowsView").getRow(0).is(":focus"), "row 0 is focused");
});

QUnit.testInActiveWindow("Highlight group row on focus()", function(assert) {
    var keyboardController,
        focusedCellChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        columns: [
            { dataField: "team", groupIndex: 0, autoExpandGroup: true },
            "name",
            "age"
        ],
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
            e.isHighlighted = true;
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.getView("rowsView");
    keyboardController.focus(null);
    this.clock.tick(500);

    // assert
    assert.equal(focusedCellChangingCount, 1, "onFocusedCellChanging fires count");
    assert.ok($("#container .dx-datagrid-focus-overlay:visible").length, "has focus overlay");
    assert.ok(this.getView("rowsView").getRow(0).is(":focus"), "row 0 is focused");
});

QUnit.testInActiveWindow("Fire onFocusedRowChanging by click", function(assert) {
    // arrange
    var focusedRowChangingCount = 0;

    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            ++focusedRowChangingCount;
            assert.equal(e.cancel, false);
            assert.equal(e.event.type, pointerEvents.up);
            assert.equal(e.newRowIndex, 1);
            assert.equal(e.prevRowIndex, 4);
            assert.equal(e.rows.length, 6);
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleRowIndex(), 1, "Focused row index is 1");
    assert.equal(focusedRowChangingCount, 1, "onFocusedRowChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedRowChanging by UpArrow key", function(assert) {
    var rowsView,
        focusedRowChangingCount = 0,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            ++focusedRowChangingCount;
            assert.equal(e.cancel, false);
            assert.equal(e.newRowIndex, 3);
            assert.equal(e.prevRowIndex, 4);
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();


    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex is 4");
    // act
    keyboardController._upDownKeysHandler({ key: "ArrowUp", keyName: "upArrow" });
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleRowIndex(), 3, "Focused row index is 3");
    assert.equal(focusedRowChangingCount, 1, "onFocusedRowChanging fires count");
});

QUnit.testInActiveWindow("DataGrid - should restore previos row index after the focus losing (T804103)", function(assert) {
    var rowsView,
        focusedRowChangingCount = 0,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [{ name: "Alex" }, { name: "Dan" }];
    this.columns = ["name"];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Dan",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            focusedRowChangingCount++;

            // assert
            if(focusedRowChangingCount === 1) {
                assert.equal(e.prevRowIndex, 1, "prevRowIndex is right");
            } else if(focusedRowChangingCount === 2) {
                assert.equal(e.prevRowIndex, 0, "prevRowIndex is right");
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");

    // act
    $(rowsView.getCellElement(0, 0)).trigger(CLICK_EVENT);
    keyboardController._focusedCellPosition = {};
    $(rowsView.getCellElement(1, 0)).trigger(CLICK_EVENT);

    // assert
    assert.equal(focusedRowChangingCount, 2, "focusedRowChangingCount");
});

QUnit.testInActiveWindow("Fire onFocusedRowChanging by UpArrow key when virtual scrolling is enabled", function(assert) {
    // arrange
    var rowsView,
        scrollable,
        $scrollContainer,
        focusedRowChangingCount = 0,
        keyboardController;

    this.$element = function() {
        return $("#container");
    };

    this.data = generateItems(100);

    this.options = {
        keyExpr: "id",
        focusedRowEnabled: true,
        focusedRowKey: 41,
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            ++focusedRowChangingCount;

            // assert
            assert.equal(e.cancel, false);
            assert.equal(e.newRowIndex, 39);
            assert.equal(e.prevRowIndex, 40);
        },
        paging: {
            pageIndex: 2
        },
        scrolling: {
            mode: "virtual"
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    rowsView = this.gridView.getView("rowsView");
    rowsView.height(400);
    rowsView.resize();
    scrollable = rowsView.getScrollable();
    $scrollContainer = $(scrollable._container());
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 40, "FocusedRowIndex is 40");

    // act
    keyboardController._upDownKeysHandler({ key: "ArrowUp", keyName: "upArrow" });
    $scrollContainer.trigger("scroll");
    this.clock.tick();

    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleRowIndex(), 19, "Focused row index is 19");
    assert.equal(focusedRowChangingCount, 1, "onFocusedRowChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedRowChanging by DownArrow key", function(assert) {
    var rowsView,
        focusedRowChangingCount = 0,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            ++focusedRowChangingCount;
            assert.equal(e.cancel, false);
            assert.equal(e.newRowIndex, 5);
            assert.equal(e.prevRowIndex, 4);
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();


    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex is 4");
    // act
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleRowIndex(), 5, "Focused row index is 5");
    assert.equal(focusedRowChangingCount, 1, "onFocusedRowChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedRowChanging by Tab key", function(assert) {
    var rowsView,
        keyboardController,
        focusedRowChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            if(++focusedRowChangingCounter > 1) {
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.newRowIndex, 2, "New row index");
                assert.equal(e.prevRowIndex, 1, "Prev row index");
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // assert, act
    this.triggerKeyDown("tab", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedRowChangingCounter, 1, "focusedRowChanging count");
    // assert, act
    this.triggerKeyDown("tab", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    assert.equal(focusedRowChangingCounter, 1, "focusedRowChanging count");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    // assert, act
    this.triggerKeyDown("tab", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedRowChangingCounter, 2, "focusedRowChanging count");
});

QUnit.testInActiveWindow("Fire onFocusedRowChanging by Tab key in back order (shift presset)", function(assert) {
    var rowsView,
        keyboardController,
        focusedRowChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            if(++focusedRowChangingCounter > 1) {
                assert.equal(e.cancel, false);
                assert.equal(e.newRowIndex, 0);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(2)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    // assert, act
    this.triggerKeyDown("tab", false, true, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedRowChangingCounter, 1, "focusedRowChanging count");
    // assert, act
    this.triggerKeyDown("tab", false, true, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedRowChangingCounter, 1, "focusedRowChanging count");
    // assert, act
    this.triggerKeyDown("tab", false, true, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 0, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    assert.equal(focusedRowChangingCounter, 2, "focusedRowChanging count");
});

QUnit.testInActiveWindow("Setting cancel in onFocusedRowChanging event args should prevent change focused row", function(assert) {
    var focusedRowChangingCount = 0,
        focusedRowChangedCount = 0;
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedRowChanging: function(e) {
            focusedRowChangingCount++;
            e.cancel = true;
        },
        onFocusedRowChanged: function(e) {
            focusedRowChangedCount++;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    assert.equal(focusedRowChangingCount, 1, "focusedRowChanging count");
    assert.equal(focusedRowChangedCount, 0, "focusedRowChanged count");
    assert.equal(this.getController("keyboardNavigation").getVisibleRowIndex(), 4, "Focused row index is 5");
});

QUnit.testInActiveWindow("Focused row events should not fire if dataGrid is in loading phase", function(assert) {
    var focusedRowChangingCount = 0,
        focusedRowChangedCount = 0,
        dataController,
        keyboardController,
        items = [
            { name: "Alex", phone: "111111", room: 6 },
            { name: "Dan", phone: "2222222", room: 5 },
            { name: "Ben", phone: "333333", room: 4 },
            { name: "Sean", phone: "4545454", room: 3 },
            { name: "Smith", phone: "555555", room: 2 },
            { name: "Zeb", phone: "6666666", room: 1 }
        ];

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = {
        load: function(options) {
            var d = $.Deferred();
            setTimeout(function() {
                d.resolve({
                    data: items.slice(options.skip, options.skip + options.take),
                    totalCount: items.length
                });
            }, 10);
            return d;
        }
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        remoteOperations: true,
        paging: {
            pageSize: 2
        },
        onFocusedRowChanging: function(e) {
            focusedRowChangingCount++;
            if(!e.event && e.newRowIndex === e.prevRowIndex) {
                dataController.pageIndex(dataController.pageIndex() + 1);
            }
        },
        onFocusedRowChanged: function(e) {
            ++focusedRowChangedCount;
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    dataController = this.getController("data");

    this.clock.tick(10);

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.gridView.getView("rowsView");

    // act
    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });

    // assert
    assert.equal(focusedRowChangingCount, 2, "focusedRowChanging does not fired during loading");
    assert.equal(focusedRowChangedCount, 1, "focusedRowChanged does not fired during loading");
});

QUnit.testInActiveWindow("onFocusedRowChanged event", function(assert) {
    // arrange
    var focusedRowChangedCount = 0;

    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        loadingTimeout: 0,
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Dan",
        onFocusedRowChanged: function(e) {
            ++focusedRowChangedCount;
            assert.equal(e.row.key, "Dan", "Row");
            assert.equal(e.rowIndex, 1, "Row index");
            assert.ok(e.rowElement, "Row element");
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    // assert
    assert.equal(focusedRowChangedCount, 1, "onFocusedRowChanged fires count");
});

QUnit.testInActiveWindow("onFocusedRowChanged event should fire if 'focusedRowKey' is null", function(assert) {
    // arrange, act
    var focusedRowChangedCount = 0;

    this.$element = function() {
        return $("#container");
    };
    this.data = [
        { id: 0, name: "Smith" },
        { id: null, name: "Zeb" }
    ];
    this.columns = ["id", "name"];
    this.options = {
        loadingTimeout: 0,
        keyExpr: "id",
        focusedRowEnabled: true,
        focusedRowIndex: 0,
        onFocusedRowChanged: () => ++focusedRowChangedCount
    };
    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.option("focusedRowIndex", 1);
    this.clock.tick();

    // assert
    assert.equal(focusedRowChangedCount, 2, "onFocusedRowChanged fires count");
});

QUnit.testInActiveWindow("onFocusedRowChanged event should fire only once if row focused and fixed columns enabled (T729593)", function(assert) {
    // arrange, act
    var focusedRowChangedCount = 0;

    this.$element = function() {
        return $("#container");
    };
    this.data = [
        { id: 0, name: "Smith" },
        { id: 1, name: "Zeb" }
    ];
    this.columns = [
        {
            dataField: "id",
            width: 100,
            fixed: true
        },
        "name"
    ];
    this.options = {
        loadingTimeout: 0,
        keyExpr: "id",
        focusedRowEnabled: true,
        columnFixing: {
            enabled: true
        },
        onFocusedRowChanged: () => ++focusedRowChangedCount
    };
    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.option("focusedRowIndex", 1);
    this.clock.tick();

    // assert
    assert.equal(focusedRowChangedCount, 1, "onFocusedRowChanged fires count");
});

QUnit.testInActiveWindow("onFocusedCellChanged event", function(assert) {
    var rowsView,
        focusedCellChangedCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
            assert.deepEqual(e.cellElement.text(), rowsView.getRow(1).find("td").eq(1).text(), "Cell element");
            assert.equal(e.columnIndex, 1, "Column index");
            assert.deepEqual(e.row.data, { name: "Dan", phone: "2222222", room: 5 }, "Row data");
            assert.deepEqual(e.rowIndex, 1, "Row index");
            assert.equal(e.column.dataField, "phone", "Column");
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    rowsView = this.gridView.getView("rowsView");
    $(rowsView.getRow(1).find("td").eq(1)).trigger(pointerEvents.up).click();
    assert.equal(focusedCellChangedCount, 1, "onFocusedCellChanged fires count");
});

QUnit.testInActiveWindow("onFocusedCellChanged event should fire if row index changed", function(assert) {
    var rowsView,
        focusedCellChangedCount = 0,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        editing: {
            allowEditing: false
        },
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
            assert.deepEqual(e.cellElement.text(), rowsView.getRow(3).find("td").eq(1).text(), "Cell element");
            assert.equal(e.columnIndex, 1, "Column index");
            assert.deepEqual(e.row.data, { name: "Sean", phone: "4545454", room: 3 }, "Row data");
            assert.deepEqual(e.rowIndex, 3, "Row index");
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex is 4");
    // act
    keyboardController._updateFocusedCellPosition($(rowsView.getRow(3).find("td").eq(1)));
    // assert
    assert.equal(this.option("focusedRowIndex"), 3, "FocusedRowIndex is 3");
    assert.equal(focusedCellChangedCount, 1, "onFocusedCellChanged fires count");
});

QUnit.testInActiveWindow("onFocusedCellChanged event should not fire if cell position not changed", function(assert) {
    var rowsView,
        focusedCellChangedCount = 0,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 2,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex is 4");
    assert.equal(this.option("focusedColumnIndex"), 2, "FocusedColumnIndex is 2");
    // act
    keyboardController._updateFocusedCellPosition($(rowsView.getRow(4).find("td").eq(2)));
    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex is 4");
    assert.equal(this.option("focusedColumnIndex"), 2, "FocusedColumnIndex is 2");
    assert.equal(focusedCellChangedCount, 0, "onFocusedCellChanged fires count");
});

QUnit.testInActiveWindow("onFocusedCellChanged event should not fire if cell position updates for not cell element", function(assert) {
    var rowsView,
        focusedCellChangedCount = 0,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 }
    ];

    this.options = {
        keyExpr: "name",
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._updateFocusedCellPosition(rowsView.getRow(1));

    // assert
    assert.equal(focusedCellChangedCount, 0, "onFocusedCellChanged fires count");
});

QUnit.testInActiveWindow("onFocusedCellChanged event the inserted row (T743086)", function(assert) {
    var focusedCellChangedCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 1 },
        { name: "Dan", phone: "2222222", room: 2 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            mode: "batch"
        },
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
            assert.ok(e.row.isNewRow, "Inserted row");
            assert.equal(e.row.rowType, "data", "Row type");
            assert.deepEqual(e.row.data, { }, "Row data");
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.addRow();
    this.clock.tick();
    // assert
    assert.equal(focusedCellChangedCount, 0, "onFocusedCellChanged fires count");

    // act
    this.triggerKeyDown("tab", false, false, $(":focus"));
    // assert
    assert.equal(focusedCellChangedCount, 1, "onFocusedCellChanged fires count");
});

QUnit.test("onFocusedCellChanged event should contains correct row object if scrolling mode is virtual", function(assert) {
    var that = this,
        focusedCellChangedCount = 0,
        rowsView,
        scrollable;

    // arrange
    that.$element = function() {
        return $("#container");
    };

    that.data = generateItems(50);

    that.options = {
        keyExpr: "id",
        height: 100,
        editing: {
            mode: "batch",
            allowUpdating: true
        },
        paging: {
            pageSize: 3
        },
        scrolling: {
            mode: "virtual",
            useNative: false
        },
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
            assert.ok(e.row, "Row object present");
            assert.equal(e.row.key, 13, "Key");
            assert.equal(e.row.rowIndex, 0, "Local rowIndex");
            assert.equal(e.rowIndex, 12, "Global rowIndex");
        },
        columns: ["id", "field1", "field2"]
    };

    that.setupModule();

    that.gridView.render($("#container"));
    rowsView = that.gridView.getView("rowsView");
    rowsView.height(100);
    rowsView.resize();
    scrollable = rowsView.getScrollable();

    that.clock.tick();

    // act
    scrollable.scrollBy({ y: 400 });
    that.clock.tick();
    $(that.getCellElement(0, 1)).trigger(CLICK_EVENT);
    // assert
    assert.equal(focusedCellChangedCount, 1, "onFocusedCellChanged fires count");
});

QUnit.test("onFocusedCellChanged event should contains correct row object if scrolling, rowRenderingMode are virtual", function(assert) {
    var that = this,
        focusedCellChangedCount = 0,
        rowsView,
        scrollable;

    // arrange
    that.$element = function() {
        return $("#container");
    };

    that.data = generateItems(50);

    that.options = {
        keyExpr: "id",
        height: 100,
        editing: {
            mode: "batch",
            allowUpdating: true
        },
        paging: {
            pageSize: 3
        },
        scrolling: {
            mode: "virtual",
            rowRenderingMode: "virtual",
            useNative: false
        },
        onFocusedCellChanged: function(e) {
            ++focusedCellChangedCount;
            assert.ok(e.row, "Row object present");
            assert.equal(e.row.key, 13, "Key");
            assert.equal(e.row.rowIndex, 0, "Local rowIndex");
            assert.equal(e.rowIndex, 12, "Global rowIndex");
        },
        columns: ["id", "field1", "field2"]
    };

    that.setupModule();

    that.gridView.render($("#container"));
    rowsView = that.gridView.getView("rowsView");
    rowsView.height(100);
    rowsView.resize();
    scrollable = rowsView.getScrollable();

    that.clock.tick();

    // act
    scrollable.scrollBy({ y: 400 });
    that.clock.tick();
    $(that.getCellElement(0, 1)).trigger(CLICK_EVENT);
    // assert
    assert.equal(focusedCellChangedCount, 1, "onFocusedCellChanged fires count");
});

QUnit.testInActiveWindow("Setting cancel in onFocusedCellChanging event should prevent focusing next cell", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 1,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;

            assert.equal(e.cancel, false, "Not canceled");
            assert.equal(e.cellElement.text(), $(rowsView.getRow(4).find("td").eq(0)).text(), "Cell element");
            assert.equal(e.newColumnIndex, 0);
            assert.equal(e.prevColumnIndex, 1);
            assert.equal(e.newRowIndex, 4);
            assert.equal(e.prevRowIndex, 4);
            assert.equal(e.rows.length, 6);
            assert.equal(e.columns.length, 3);

            e.cancel = true;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowLeft", keyName: "leftArrow" });
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleColumnIndex(), 1, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("DataGrid should fire onFocusedCellChanging event if next focused cell is not valid", function(assert) {
    var rowsView,
        keyboardController,
        onFocusedCellCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { team: 'internal', name: 'Alex', age: 30 },
        { team: 'internal', name: 'Bob', age: 29 },
        { team: 'internal0', name: 'Den', age: 24 },
        { team: 'internal0', name: 'Dan', age: 23 },
        { team: 'public', name: 'Alice', age: 19 },
        { team: 'public', name: 'Zeb', age: 18 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Bob",
        focusedColumnIndex: 1,
        columns: [
            { dataField: "team", groupIndex: 0, autoExpandGroup: true },
            "name",
            "age"
        ],
        onFocusedCellChanging: function(e) {
            ++onFocusedCellCount;
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 2, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");

    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowLeft", keyName: "leftArrow" });

    // assert
    assert.equal(onFocusedCellCount, 1, "onFocusedCellCount");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by click", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            assert.equal(e.cancel, false, "Not canceled");
            assert.equal(e.cellElement.text(), $(rowsView.getRow(4).find("td").eq(1)).text(), "Cell element");
            assert.equal(e.newColumnIndex, 1);
            assert.equal(e.prevColumnIndex, undefined);
            assert.equal(e.newRowIndex, 4);
            assert.equal(e.prevRowIndex, undefined);
            assert.equal(e.isHighlighted, false);
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // act
    $(this.gridView.getView("rowsView").getRow(4).find("td").eq(1)).trigger(pointerEvents.up).click();
    this.clock.tick();
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleColumnIndex(), 1, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("Highlight cell by isHighlighted arg in the onFocusedCellChanging event by click event", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            e.isHighlighted = true;
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // act
    $(rowsView.getRow(4).find("td").eq(1)).trigger(pointerEvents.up).click();
    this.clock.tick();
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleColumnIndex(), 1, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
    assert.ok($("#container .dx-datagrid-focus-overlay:visible").length, "has focus overlay");
});

QUnit.testInActiveWindow("isHighlighted in the onFocusedCellChanged event", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0,
        focusedColumnChangedCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            e.isHighlighted = true;
        },
        onFocusedCellChanged: function(e) {
            ++focusedColumnChangedCount;
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // act
    $(rowsView.getRow(1).find("td").eq(1)).trigger(pointerEvents.up).click();
    this.clock.tick();
    // assert
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
    assert.equal(focusedColumnChangedCount, 1, "focusedColumnChangedCount fires count");
});

QUnit.testInActiveWindow("Should not render overlay on focused row with tabindex if useKeyboard set false", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 }
    ];

    this.options = {
        keyboardNavigation: {
            enabled: false
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    $(this.getRowElement(1))
        .attr("tabindex", 0)
        .focus();
    $(this.getCellElement(1, 1))
        .trigger("dxpointerdown");
    this.clock.tick();

    // assert
    assert.notOk(dataGridWrapper.rowsView.isFocusOverlayVisible(), "has no focus overlay");
});

QUnit.testInActiveWindow("Not highlight cell by isHighlighted arg in the onFocusedCellChanging event by LeftArrow key", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 1,
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            e.isHighlighted = false;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowLeft", keyName: "leftArrow" });
    this.clock.tick();
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleColumnIndex(), 0, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
    assert.notOk($("#container .dx-datagrid-focus-overlay:visible").length, "has focus overlay");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by LeftArrow key", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 1,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            assert.equal(e.cancel, false, "Not canceled");
            assert.equal(e.cellElement.text(), $(rowsView.getRow(4).find("td").eq(0)).text(), "Cell element");
            assert.equal(e.newColumnIndex, 0);
            assert.equal(e.prevColumnIndex, 1);
            assert.equal(e.newRowIndex, 4);
            assert.equal(e.prevRowIndex, 4);
            assert.equal(e.isHighlighted, true);
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowLeft", keyName: "leftArrow" });
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleColumnIndex(), 0, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by RightArrow key", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 1,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            assert.equal(e.cancel, false, "Not canceled");
            assert.equal(e.cellElement.text(), $(rowsView.getRow(4).find("td").eq(2)).text(), "Cell element");
            assert.equal(e.newColumnIndex, 2);
            assert.equal(e.prevColumnIndex, 1);
            assert.equal(e.newRowIndex, 4);
            assert.equal(e.prevRowIndex, 4);
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowRight", keyName: "rightArrow" });
    // assert
    assert.equal(this.getController("keyboardNavigation").getVisibleColumnIndex(), 2, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by RightArrow key and change newRowIndex, newColumnIndex", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 1,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            assert.equal(e.cancel, false, "Not canceled");
            e.newRowIndex = 1;
            e.newColumnIndex = 0;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowRight", keyName: "rightArrow" });
    this.clock.tick();
    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getVisibleColumnIndex(), 0, "Focused column index");
    assert.equal(focusedColumnChangingCount, 1, "onFocusedCellChanging fires count");
    assert.ok(rowsView.getRow(1).find("td").eq(0).hasClass("dx-focused"), "Focused cell");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging, onFocusedRowChanging by DownArrow key and change newRowIndex, newColumnIndex", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0,
        focusedRowChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Smith",
        focusedColumnIndex: 1,
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            assert.equal(e.cancel, false, "Not canceled");
            e.newRowIndex = 1;
            e.newColumnIndex = 0;
        },
        onFocusedRowChanging: function(e) {
            ++focusedRowChangingCount;
            assert.equal(e.cancel, false, "Not canceled");
            e.newRowIndex = 3;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 4, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 1, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowRight", keyName: "rightArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    this.clock.tick();
    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 3, "Focused row index");
    assert.equal(keyboardController.getVisibleColumnIndex(), 0, "Focused column index");
    assert.equal(focusedColumnChangingCount, 2, "onFocusedCellChanging fires count");
    assert.equal(focusedRowChangingCount, 1, "onFocusedRowChanging fires count");
    assert.ok(rowsView.getRow(3).find("td").eq(0).hasClass("dx-focused"), "Focused cell");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by UpArrow key", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Ben",
        focusedColumnIndex: 0,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            if(focusedColumnChangingCount === 2) {
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(1)).text(), "Cell element");
                assert.equal(e.newColumnIndex, 1);
                assert.equal(e.prevColumnIndex, 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 2);
            }
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 2, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 0, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowRight", keyName: "rightArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowUp", keyName: "upArrow" });
    // assert
    assert.equal(this.option("focusedColumnIndex"), 1, "Focused column index");
    assert.equal(this.option("focusedRowIndex"), 1, "Focused row index");
    assert.equal(focusedColumnChangingCount, 2, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by DownArrow key", function(assert) {
    var rowsView,
        keyboardController,
        focusedColumnChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Ben",
        focusedColumnIndex: 0,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            if(focusedColumnChangingCount === 2) {
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(3).find("td").eq(1)).text(), "Cell element");
                assert.equal(e.newColumnIndex, 1);
                assert.equal(e.prevColumnIndex, 1);
                assert.equal(e.newRowIndex, 3);
                assert.equal(e.prevRowIndex, 2);
            }
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowIndex"), 2, "FocusedRowIndex");
    assert.equal(this.option("focusedColumnIndex"), 0, "FocusedColumnIndex");
    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowRight", keyName: "rightArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    // assert
    assert.equal(this.option("focusedColumnIndex"), 1, "Focused column index");
    assert.equal(this.option("focusedRowIndex"), 3, "Focused row index");
    assert.equal(focusedColumnChangingCount, 2, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by UpDownArrow keys may prevent change focused row", function(assert) {
    var keyboardController,
        focusedColumnChangingCount = 0,
        focusedRowChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Ben",
        focusedColumnIndex: 0,
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            ++focusedColumnChangingCount;
            if(focusedColumnChangingCount === 2) {
                e.cancel = true;
            }
        },
        onFocusedRowChanging: function(e) {
            focusedRowChangingCount++;
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = this.gridView.getView("rowsView");

    // act
    keyboardController._leftRightKeysHandler({ key: "ArrowRight", keyName: "rightArrow" });
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    // assert
    assert.equal(this.option("focusedRowIndex"), 2, "Focused row index");
    assert.equal(focusedColumnChangingCount, 2, "focusedColumnChangingCount");
    assert.equal(focusedRowChangingCount, 0, "focusedRowChangingCount");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Tab key", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0,
        columnIndex;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                columnIndex = focusedCellChangingCounter - 1;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex - 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // assert, act
    this.triggerKeyDown("tab", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    // assert, act
    this.triggerKeyDown("tab", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 3, "focusedCellChanging count");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Tab key in back order (shift presset)", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: false
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                var columnIndex = 3 - focusedCellChangingCounter;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex + 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(2)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    // assert, act
    this.triggerKeyDown("tab", false, true, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    // assert, act
    this.triggerKeyDown("tab", false, true, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 3, "focusedCellChanging count");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Tab key if cell is being edited", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            mode: "batch"
        },
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCounter;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");

    // act
    this.editCell(1, 0);
    this.triggerKeyDown("tab", false, false, rowsView.getRow(1).find("td:focus"));

    // assert
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");

    // act
    this.triggerKeyDown("tab", false, true, rowsView.getRow(1).find("td:focus"));

    // assert
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 3, "focusedCellChanging count");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Enter key if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'moveFocus'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0,
        columnIndex;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: false
        },
        keyboardNavigation: {
            enterKeyAction: "moveFocus",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                columnIndex = focusedCellChangingCounter - 1;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex - 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // assert, act
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    // assert, act
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 3, "focusedCellChanging count");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Enter key if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'startEdit'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0,
        columnIndex;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "startEdit",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                columnIndex = focusedCellChangingCounter - 1;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex - 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 1, "focusedCellChanging count");
    assert.ok(this.editingController.isEditing(), "Is editing");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Enter key if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'moveFocus'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0,
        columnIndex;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "moveFocus",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                columnIndex = focusedCellChangingCounter - 1;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex - 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Enter key if 'enterKeyDirection' is 'column', 'enterKeyAction' is 'startEdit'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0,
        columnIndex;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "startEdit",
            enterKeyDirection: "column"
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                columnIndex = focusedCellChangingCounter - 1;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex - 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 1, "focusedCellChanging count");
    assert.ok(this.editingController.isEditing(), "Is editing");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Fire onFocusedCellChanging by Enter key if 'enterKeyDirection' is 'column', 'enterKeyAction' is 'moveFocus'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0,
        columnIndex;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "moveFocus",
            enterKeyDirection: "column"
        },
        onFocusedCellChanging: function(e) {
            if(++focusedCellChangingCounter > 2) {
                columnIndex = focusedCellChangingCounter - 1;
                assert.equal(e.cancel, false, "Not canceled");
                assert.equal(e.cellElement.text(), $(rowsView.getRow(1).find("td").eq(columnIndex)).text(), "Cell element");
                assert.equal(e.newColumnIndex, columnIndex);
                assert.equal(e.prevColumnIndex, columnIndex - 1);
                assert.equal(e.newRowIndex, 1);
                assert.equal(e.prevRowIndex, 1);
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Changing row index by Enter key navigation if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'moveFocus'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "moveFocus",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCounter;
            if(e.event.key) {
                ++e.newRowIndex;
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Changing row index by Enter key navigation if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'startEdit'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "startEdit",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCounter;
            if(e.event.key) {
                ++e.newRowIndex;
            }
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.gridView.getView("rowsView").getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 1, "focusedCellChanging count");
    assert.ok(this.editingController.isEditing(), "Is editing");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 1, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Enter key navigation from the last cell should navigate to the new row and first column if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'startEdit'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "startEdit",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCounter;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.getCellElement(1, 2)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 1, "focusedCellChanging count");
    assert.ok(this.editingController.isEditing(), "Is editing");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.testInActiveWindow("Enter key navigation from the last cell should navigate to the new row and first column if 'enterKeyDirection' is 'row', 'enterKeyAction' is 'moveFocus'", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCounter = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: true,
            allowUpdating: true
        },
        keyboardNavigation: {
            enterKeyAction: "moveFocus",
            enterKeyDirection: "row"
        },
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCounter;
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    $(this.getCellElement(1, 2)).trigger(pointerEvents.up).click();
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(keyboardController.getVisibleRowIndex(), 1, "FocusedRowIndex");
    assert.equal(keyboardController.getFocusedColumnIndex(), 2, "FocusedColumnIndex");
    // act, assert
    this.triggerKeyDown("enter", false, false, rowsView.getRow(1).find("td:focus"));
    this.clock.tick();
    assert.ok(keyboardController.isCellFocusType(), "Cell focus type");
    assert.equal(keyboardController.getVisibleRowIndex(), 2, "Focused row index");
    assert.equal(keyboardController.getFocusedColumnIndex(), 0, "FocusedColumnIndex");
    assert.equal(focusedCellChangingCounter, 2, "focusedCellChanging count");
    assert.notOk(this.editingController.isEditing(), "Is editing");
});

QUnit.test("Test navigateToRow method if paging", function(assert) {
    var keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: false
        },
        paging: {
            pageSize: 2
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");

    assert.equal(this.pageIndex(), 0, "Page index");
    assert.equal(keyboardController.getVisibleRowIndex(), undefined, "Focused row index");

    this.navigateToRow("Zeb");
    this.clock.tick();

    assert.equal(this.pageIndex(), 2, "Page index");
    assert.equal(keyboardController.getVisibleRowIndex(), undefined, "Focused row index");
});

QUnit.test("Test navigateToRow method if virtualScrolling", function(assert) {
    var keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        editing: {
            allowEditing: false
        },
        paging: {
            pageSize: 2
        },
        scrolling: {
            mode: "virtual"
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    keyboardController = this.getController("keyboardNavigation");

    assert.equal(this.pageIndex(), 0, "Page index");
    assert.equal(keyboardController.getVisibleRowIndex(), undefined, "Focused row index");

    this.navigateToRow("Zeb");
    this.clock.tick();

    assert.equal(this.pageIndex(), 2, "Page index");
    assert.equal(keyboardController.getVisibleRowIndex(), undefined, "Focused row index");
    assert.ok(dataGridWrapper.rowsView.isRowVisible(1), "Navigation row is visible");
});

QUnit.test("Focused row should be visible if set focusedRowKey", function(assert) {
    // arrange
    var rowsView,
        counter = 0;

    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        height: 100,
        focusedRowKey: "Smith",
        focusedRowEnabled: true
    };

    this.setupModule();

    this.gridView.render($("#container"));
    rowsView = this.gridView.getView("rowsView");
    rowsView._scrollToElement = function($row) {
        ++counter;
        assert.ok($row.find("td").eq(0).text(), "Smith", "Row");
    };
    rowsView.height(100);
    this.gridView.component.updateDimensions();
    this.clock.tick();

    // assert
    assert.ok(rowsView.getRow(4).hasClass("dx-row-focused"), "Focused row");
    assert.ok(counter > 0, "_scrollToElement has invoked");
});

QUnit.test("Focused row should preserve on navigation to the other row in virual scrolling mode if page not loaded", function(assert) {
    // arrange
    var rowsView;

    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        height: 100,
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        },
        scrolling: {
            mode: "virtual"
        },
        paging: {
            pageSize: 2
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    rowsView = this.gridView.getView("rowsView");
    rowsView.height(100);
    rowsView.resize();
    this.clock.tick();

    this.getController("focus").navigateToRow("Smith");
    this.clock.tick();

    // assert
    assert.notOk(rowsView.getRow(4).hasClass("dx-row-focused"), "Focused row");
    assert.ok(dataGridWrapper.rowsView.isRowVisible(4), "Navigation row is visible");
});

QUnit.test("Focused row should preserve on navigation to the other row in infinite scrolling mode if page not loaded", function(assert) {
    // arrange
    var rowsView;

    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 5 },
        { name: "Ben", phone: "333333", room: 4 },
        { name: "Sean", phone: "4545454", room: 3 },
        { name: "Smith", phone: "555555", room: 2 },
        { name: "Zeb", phone: "6666666", room: 1 }
    ];

    this.options = {
        keyExpr: "name",
        height: 100,
        focusedRowEnabled: true,
        editing: {
            allowEditing: false
        },
        scrolling: {
            mode: "infinite"
        },
        paging: {
            pageSize: 2
        }
    };

    this.setupModule();

    this.gridView.render($("#container"));
    rowsView = this.gridView.getView("rowsView");
    rowsView.height(100);
    rowsView.resize();
    this.clock.tick();

    this.getController("focus").navigateToRow("Smith");

    // assert
    assert.notOk(rowsView.getRow(4).hasClass("dx-row-focused"), "Focused row");
    assert.equal($(this.getCellElement(4, 0)).text(), "Smith", "Name in navigation row");
    assert.ok(dataGridWrapper.rowsView.isRowVisible(4), "Navigation row is visible");
});

QUnit.testInActiveWindow("Keyboard navigation controller should find next cell if column index is wrong when jump from the group row", function(assert) {
    var rowsView,
        keyboardController,
        $cell;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 6 },
        { name: "Ben", phone: "333333", room: 6 },
        { name: "Sean", phone: "4545454", room: 5 },
        { name: "Smith", phone: "555555", room: 5 },
        { name: "Zeb", phone: "6666666", room: 5 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 0,
        focusedColumnIndex: 1,
        columns: [
            { type: "selection" },
            "name",
            "phone",
            {
                dataField: "room",
                groupIndex: 0,
                autoExpandGroup: true
            }
        ]
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;
    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex is 0");
    // act
    $cell = keyboardController._getNextCell("downArrow");
    // assert
    assert.ok(keyboardController._isCellValid($cell), "Found valid cell");
});

QUnit.testInActiveWindow("DataGrid should focus the row bellow by arrowDown key if grid focused and if selection multiple", function(assert) {
    var rowsView,
        keyboardController;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 6 },
        { name: "Ben", phone: "333333", room: 6 },
        { name: "Sean", phone: "4545454", room: 5 },
        { name: "Smith", phone: "555555", room: 5 },
        { name: "Zeb", phone: "6666666", room: 5 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 0,
        columns: [
            { type: "selection" },
            "name",
            "phone",
            "room"
        ]
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;
    // assert
    assert.equal(this.option("focusedRowIndex"), 0, "FocusedRowIndex is 0");
    assert.notOk(rowsView.getRow(1).hasClass("dx-row-focused"), "Row 1 is not focused");
    // act
    keyboardController._upDownKeysHandler({ key: "ArrowDown", keyName: "downArrow" });
    // assert
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "Row 1 is focused");
});

QUnit.testInActiveWindow("DataGrid should focus the row below by arrowDown key if grid focused and grouping enabled", function(assert) {
    var rowsView,
        keyboardController,
        $cell;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.data = [
        { name: "Alex", phone: "111111", room: 6 },
        { name: "Dan", phone: "2222222", room: 6 },
        { name: "Ben", phone: "333333", room: 6 },
        { name: "Sean", phone: "4545454", room: 5 },
        { name: "Smith", phone: "555555", room: 5 },
        { name: "Zeb", phone: "6666666", room: 5 }
    ];

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        columns: [
            "name",
            "phone",
            { dataField: "room", groupIndex: 0, autoExpandGroup: true }
        ]
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // act
    keyboardController.setFocusedColumnIndex(0);
    keyboardController.focus(rowsView.getRow(1).find("td").eq(0));
    $cell = keyboardController._getNextCell("downArrow");


    // assert
    assert.equal($cell, undefined, "Cell is undefined");
});

QUnit.testInActiveWindow("If editing in row edit mode and focusedRowEnabled - focusOverlay should render for the editing row", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1,
        editing: {
            mode: "row",
            allowUpdating: true
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    // act
    this.gridView.component.editRow(1);
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");

    $(rowsView.getRow(1).find("td").eq(0)).trigger(pointerEvents.up).click();

    // assert
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "Row 1 is focused");
    assert.ok(rowsView.getRow(1).find("td").eq(0).hasClass("dx-focused"), "Cell 0 is focused");
    assert.ok(rowsView.element().find(".dx-datagrid-focus-overlay").is(":visible"), "Focus overlay present");
});

QUnit.testInActiveWindow("If editing in cell edit mode and focusedRowEnabled - focusOverlay should render for the editing row", function(assert) {
    var rowsView;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1,
        editing: {
            mode: "cell",
            allowUpdating: true
        }
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    // act
    this.editCell(1, 1);
    rowsView = this.gridView.getView("rowsView");
    $(rowsView.getRow(1).find("td").eq(1)).trigger(pointerEvents.up).click();
    this.clock.tick();

    // assert
    assert.ok(rowsView.getRow(1).hasClass("dx-row-focused"), "Row 1 is focused");
    assert.ok(rowsView.getRow(1).find("td").eq(1).hasClass("dx-focused"), "Cell 1 is focused");
    assert.ok(rowsView.element().find(".dx-datagrid-focus-overlay").is(":visible"), "Focus overlay present");
});

QUnit.testInActiveWindow("Focused row public API should be accessible", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1
    };

    this.setupModule();

    addOptionChangedHandlers(this);

    this.gridView.render($("#container"));

    this.clock.tick();

    // assert
    assert.notOk(this.isRowFocused("Alex"), "isRowFocused true");
    assert.ok(this.isRowFocused("Dan"), "isRowFocused false");

    // act
    this.navigateToRow("Alex");

    // assert
    assert.notOk(this.isRowFocused("Alex"), "isRowFocused true");
    assert.ok(this.isRowFocused("Dan"), "isRowFocused false");
});

QUnit.test("DataGrid should not operate with focused row if dataSource is missing", function(assert) {
    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    try {
        // act
        this.option("dataSource", null);
        this.getController("data").optionChanged({ name: "dataSource", value: null });
        // assert
        assert.ok(true, "No exception after dataSource is null");
    } catch(e) {
        // assert
        assert.ok(false, e.message);
    }
});

QUnit.testInActiveWindow("DataGrid should not focus inserted but not saved rows (T727182)", function(assert) {
    var rowsView,
        keyboardController;

    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        editing: {
            mode: "batch",
            allowAdding: true
        },
        focusedRowKey: "Dan"
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();
    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // assert
    assert.equal(this.option("focusedRowKey"), "Dan", "focusedRowKey");
    assert.equal(this.option("focusedRowIndex"), 1, "focusedRowIndex");

    // act
    this.addRow();
    this.addRow();
    $(this.getRowElement(0)).find(".dx-texteditor-input").trigger(pointerEvents.up).click();
    this.clock.tick();

    // assert
    assert.ok($(this.getRowElement(0)).find(".dx-texteditor-input").is(":focus"), "input is focused");
    assert.equal(this.option("focusedRowKey"), "Dan", "focusedRowKey");
    assert.equal(this.option("focusedRowIndex"), 3, "focusedRowIndex");
});

QUnit.testInActiveWindow("DataGrid should not focus adaptive rows", function(assert) {
    // arrange
    var rowsView,
        focusedRowChangingCount = 0,
        focusedRowChangedCount = 0;

    this.$element = function() {
        return $("#container");
    };

    this.options = {
        width: 200,
        keyExpr: "name",
        columnHidingEnabled: true,
        focusedRowEnabled: true,
        onFocusedRowChanging: function() {
            focusedRowChangingCount++;
        },
        onFocusedRowChanged: function() {
            focusedRowChangedCount++;
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.expandRow("Dan");
    this.clock.tick();
    rowsView = this.gridView.getView("rowsView");
    $(rowsView.getRow(2).find("td").first()).trigger(pointerEvents.up).click();

    // assert
    assert.equal(focusedRowChangingCount, 0, "No focused row changing");
    assert.equal(focusedRowChangedCount, 0, "No focused row changed");
});

QUnit.testInActiveWindow("DataGrid should reset focused row if focusedRowKey is set to undefined", function(assert) {
    // arrange
    var rowsView,
        focusedRowChangedCallsCount = 0;

    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1,
        onFocusedRowChanged: () => {
            ++focusedRowChangedCallsCount;
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // assert
    rowsView = this.gridView.getView("rowsView");
    assert.ok($(rowsView.getRow(1)).hasClass("dx-row-focused"), "focused row");
    assert.equal(this.keyboardNavigationController._focusedCellPosition.rowIndex, this.option("focusedRowIndex"), "Keyboard navigation focused row index");

    // act
    this.option("focusedRowKey", undefined);
    // assert
    assert.equal(focusedRowChangedCallsCount, 1, "Focused row calls count");

    // assert
    assert.notOk($(rowsView.getRow(1)).hasClass("dx-row-focused"), "no focused row");
    assert.equal(this.option("focusedRowIndex"), -1, "focusedRowIndex");

    // act
    this.option("focusedRowIndex", 1);
    // assert
    assert.equal(focusedRowChangedCallsCount, 2, "Focused row calls count");

    // assert
    assert.ok($(rowsView.getRow(1)).hasClass("dx-row-focused"), "focused row");
    assert.equal(this.option("focusedRowKey"), "Dan", "focusedRowKey");

    // act
    this.option("focusedRowIndex", -1);
    // assert
    assert.equal(focusedRowChangedCallsCount, 3, "Focused row calls count");

    // assert
    assert.notOk($(rowsView.getRow(1)).hasClass("dx-row-focused"), "no focused row");
    assert.equal(this.option("focusedRowKey"), undefined, "focusedRowKey");
    assert.equal(this.option("focusedRowIndex"), -1, "focusedRowIndex");
    assert.equal(this.keyboardNavigationController._focusedCellPosition.rowIndex, this.option("focusedRowIndex"), "Keyboard navigation focused row index");
});

QUnit.testInActiveWindow("DataGrid should reset focused row if focusedRowIndex is set to < 0", function(assert) {
    // arrange
    var rowsView;

    this.$element = function() {
        return $("#container");
    };

    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowIndex: 1
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // assert
    rowsView = this.gridView.getView("rowsView");
    assert.ok($(rowsView.getRow(1)).hasClass("dx-row-focused"), "focused row");
    assert.ok(this.option("focusedRowKey"), "focusedRowKey");

    // act
    this.option("focusedRowIndex", -1);

    // assert
    assert.notOk($(rowsView.getRow(1)).hasClass("dx-row-focused"), "no focused row");
    assert.notOk(this.option("focusedRowKey"), "No focusedRowKey");
});

QUnit.testInActiveWindow("DataGrid should reset focused row if 'e.newRowIndex' is set to < 0 value in the onFocusedRowChanging event (T745451)", function(assert) {
    // arrange
    var focusedRowChangingCount = 0,
        rowsView;

    this.$element = function() {
        return $("#container");
    };
    this.data = [{ id: 0 }, { id: 1 }];
    this.options = {
        keyExpr: "id",
        focusedRowEnabled: true,
        focusedRowIndex: 1,
        onFocusedRowChanging: e => {
            ++focusedRowChangingCount;
            e.newRowIndex = -1;
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    rowsView = this.gridView.getView("rowsView");
    this.clock.tick();

    try {
        // act
        $(this.getCellElement(1, 1)).trigger(CLICK_EVENT);
        this.clock.tick();
        // assert
        assert.equal(focusedRowChangingCount, 1, "focusedRowChangingCount");
        assert.notOk($(rowsView.getRow(0)).hasClass("dx-row-focused"), "no focused row");
        assert.notOk($(rowsView.getRow(1)).hasClass("dx-row-focused"), "no focused row");
        assert.equal(this.option("focusedRowIndex"), -1, "focusedRowIndex");
        assert.equal(this.option("focusedRowKey"), undefined, "focusedRowKey");
    } catch(e) {
        // assert
        assert.ok(false, e.message);
    }
});

QUnit.testInActiveWindow("DataGrid should raise exception if focusedRowEnabled and dataSource has no operationTypes", function(assert) {
    this.$element = () => $("#container");
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.getController("data")._dataSource.operationTypes = () => undefined;
    try {
        this.option("focusedRowKey", "Dan");
    } catch(e) {
        // assert
        assert.ok(false, e);
    }
    // assert
    assert.ok(true, "undefined operationTypes does not generate exception");
});

QUnit.testInActiveWindow("DataGrid should restore focused row by index after row removed", function(assert) {
    this.$element = () => $("#container");
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Alex",
        editing: {
            allowDeleting: true,
            texts: { confirmDeleteMessage: "" }
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.removeRow(0);
    this.clock.tick();

    // assert
    assert.equal(this.option("focusedRowKey"), "Dan", "focusedRowKey was changed to the next row");
});

QUnit.testInActiveWindow("DataGrid should restore focused row by index after row removed if repaintChangesOnly is true (T720083)", function(assert) {
    this.$element = () => $("#container");
    this.options = {
        keyExpr: "name",
        focusedRowEnabled: true,
        focusedRowKey: "Alex",
        repaintChangesOnly: true,
        editing: {
            allowDeleting: true,
            texts: { confirmDeleteMessage: "" }
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.removeRow(0);
    this.clock.tick();

    // assert
    assert.equal(this.option("focusedRowKey"), "Dan", "focusedRowKey was changed to the next row");
});

QUnit.testInActiveWindow("DataGrid should restore tabindex for the first cell if focusedRowIndex is out of visible page (T726042)", function(assert) {
    // arrange
    this.$element = () => $("#container");
    this.options = {
        height: 100,
        dataSource: generateItems(10),
        scrolling: {
            mode: "virtual"
        },
        paging: {
            pageSize: 2
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    $(this.getCellElement(0, 0)).removeAttr("tabindex");
    this.option("focusedRowIndex", 9);
    this.gridView.getView("rowsView").renderFocusState();

    // assert
    assert.equal($(this.getCellElement(0, 0)).attr("tabindex"), 0, "tabindex");
});

// T730760
QUnit.testInActiveWindow("DataGrid should normalize the focused row index on paging", function(assert) {
    // arrange
    this.$element = () => $("#container");
    this.options = {
        focusedRowEnabled: true,
        height: 100,
        keyExpr: "id",
        focusedRowIndex: 3,
        dataSource: generateItems(7),
        paging: {
            pageSize: 5
        }
    };

    this.setupModule();
    addOptionChangedHandlers(this);
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    this.pageIndex(1);
    this.clock.tick();

    // assert
    assert.equal(this.option("focusedRowIndex"), 1, "focusedRowIndex is normalized");
    assert.equal(this.option("focusedRowKey"), 7, "focusedRowKey is correct");
});

QUnit.testInActiveWindow("Highlight cell on click when startEditAction is 'dblClick'", function(assert) {
    // arrange
    var focusedCellChangingCount = 0;

    this.$element = function() {
        return $("#container");
    };

    this.options = {
        onFocusedCellChanging: function(e) {
            ++focusedCellChangingCount;
            e.isHighlighted = true;
        },
        editing: {
            mode: "batch",
            allowUpdating: true,
            startEditAction: "dblClick"
        }
    };

    this.setupModule();
    this.gridView.render($("#container"));
    this.clock.tick();

    // act
    $(this.getCellElement(0, 0)).trigger(pointerEvents.up).click();
    this.clock.tick();

    // assert
    assert.strictEqual(focusedCellChangingCount, 1, "onFocusedCellChanging fires count");
    assert.ok($("#container .dx-datagrid-focus-overlay:visible").length, "has focus overlay");
});

QUnit.testInActiveWindow("DataGrid - onFocusedCellChanging event should execute on cell click in batch edit mode (T743530)", function(assert) {
    var rowsView,
        keyboardController,
        focusedCellChangingCount = 0;

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.options = {
        editing: { mode: 'batch', allowUpdating: true },
        onFocusedCellChanging: e => {
            ++focusedCellChangingCount;
        }
    };

    this.data = [
        { name: "Alex", phone: "555555", room: 1 },
        { name: "Dan", phone: "553355", room: 2 }
    ];

    this.setupModule();

    this.gridView.render($("#container"));
    this.clock.tick();

    rowsView = this.gridView.getView("rowsView");
    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // act
    $(rowsView.getRow(0).find("td").eq(1)).trigger(pointerEvents.up).click();
    this.clock.tick();
    // assert
    assert.equal(focusedCellChangingCount, 1, "onFocusedCellChanging fires count");
});

QUnit.testInActiveWindow("DataGrid - click by cell should not generate exception if rowTemplate is used (T800604)", function(assert) {
    var d = $.Deferred(),
        rowsView,
        keyboardController,
        items = generateItems(1);

    // arrange
    this.$element = function() {
        return $("#container");
    };

    this.columns = ["id", "field1"];
    this.options = {
        height: 100,
        remoteOperations: true,
        dataSource: {
            load: () => {
                if(d.state() === "resolved") {
                    d = $.Deferred();
                }
                return d.promise();
            }
        },
        paging: {
            pageSize: 1
        },
        scrolling: {
            mode: "virtual"
        }
    };

    this.setupModule();

    d.resolve(items, { totalCount: 8 });
    this.clock.tick();
    d.resolve(items);
    this.clock.tick();

    this.gridView.render($("#container"));
    rowsView = this.gridView.getView("rowsView");
    rowsView.height(100);
    rowsView.resize();

    keyboardController = this.getController("keyboardNavigation");
    keyboardController._focusedView = rowsView;

    // act
    try {
        dataGridWrapper.rowsView.getVirtualCell(0).trigger(pointerEvents.up).click();
        dataGridWrapper.rowsView.getVirtualCell(1).trigger(pointerEvents.up).click();
        assert.ok(true, "No Exception");
    } catch(e) {
        // assert
        assert.ok(false, e.message);
    }
});
