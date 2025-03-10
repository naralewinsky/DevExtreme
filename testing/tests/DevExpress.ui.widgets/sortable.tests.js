import $ from "jquery";
import pointerMock from "../../helpers/pointerMock.js";
import "ui/sortable";
import fx from "animation/fx";

import "common.css!";

fx.off = true;


QUnit.testStart(function() {
    let markup =
        `<div id="items" style="display: inline-block; vertical-align: top; width: 300px; height: 250px; position: relative; background: grey;">
            <div id="item1" class="draggable" style="width: 300px; height: 30px; background: yellow;">item1</div>
            <div id="item2" class="draggable" style="width: 300px; height: 30px; background: red;">item2</div>
            <div id="item3" class="draggable" style="width: 300px; height: 30px; background: blue;">item3</div>
        </div>
        <div id="items2" style="display: inline-block; vertical-align: top; width: 300px; height: 250px; position: relative; background: grey;">
            <div id="item4" class="draggable" style="width: 300px; height: 30px; background: yellow;">item4</div>
            <div id="item5" class="draggable" style="width: 300px; height: 30px; background: red;">item5</div>
            <div id="item6" class="draggable" style="width: 300px; height: 30px; background: blue;">item6</div>
        </div>
        <div id="items3" style="vertical-align: top; width: 300px; height: 250px; position: relative; background: grey;"></div>
        <div id="itemsHorizontal" style="width: 250px; height: 300px;">
            <div style="width: 30px; height: 300px; float: left;">item1</div>
            <div style="width: 30px; height: 300px; float: left;">item2</div>
            <div style="width: 30px; height: 300px; float: left;">item3</div>
        </div>
        `;

    $("#qunit-fixture").html(markup);
});

var SORTABLE_CLASS = "dx-sortable";

var moduleConfig = {
    beforeEach: function() {
        $("#qunit-fixture").addClass("qunit-fixture-visible");
        this.$element = $("#items");

        this.createSortable = (options) => {
            return this.sortableInstance = this.$element.dxSortable(options).dxSortable("instance");
        };
    },
    afterEach: function() {
        $("#qunit-fixture").removeClass("qunit-fixture-visible");
        this.sortableInstance && this.sortableInstance.dispose();
    }
};

var crossComponentModuleConfig = {
    createComponent: function(componentName, options, $element) {
        let instance = ($element || this.$element)[componentName](options)[componentName]("instance");
        this.instances.push(instance);
        return instance;
    },
    beforeEach: function() {
        $("#qunit-fixture").addClass("qunit-fixture-visible");

        this.instances = [];
        this.$element = $("#items");
        this.createSortable = this.createComponent.bind(this, "dxSortable");
        this.createDraggable = this.createComponent.bind(this, "dxDraggable");
    },
    afterEach: function() {
        $("#qunit-fixture").removeClass("qunit-fixture-visible");
        this.instances.forEach((instance) => {
            instance.dispose();
        });
    }
};

QUnit.module("rendering", moduleConfig);

QUnit.test("Element has class", function(assert) {
    assert.ok(this.createSortable().$element().hasClass(SORTABLE_CLASS));
});

QUnit.test("Drag template - check args", function(assert) {
    // arrange
    let items,
        dragTemplate = sinon.spy(() => {
            return $("<div>");
        });

    this.createSortable({
        filter: ".draggable",
        template: dragTemplate
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down().move(10, 0);

    // assert
    assert.strictEqual(dragTemplate.callCount, 1, "drag template is called");
    assert.deepEqual($(dragTemplate.getCall(0).args[0].itemElement).get(0), items.get(0), "first arg");
    assert.strictEqual(dragTemplate.getCall(0).args[1], 0, "second arg");
    assert.deepEqual($(dragTemplate.getCall(0).args[2]).get(0), $("body").get(0), "third arg");
});


QUnit.module("placeholder and source", moduleConfig);

QUnit.test("Source item if filter is not defined", function(assert) {
    // arrange
    this.createSortable({
        dropFeedbackMode: "push"
    });

    let $items = this.$element.children();
    let $dragItemElement = $items.eq(0);

    // assert
    assert.strictEqual($items.length, 3, "item count");

    // act
    pointerMock($dragItemElement).start().down().move(10, 0);

    // assert
    $items = this.$element.children();
    let $source = $items.eq(0);
    assert.strictEqual($items.length, 3, "item count");
    assert.ok($source.hasClass("dx-sortable-source-hidden"), "source item is hidden");
});

QUnit.test("Source item", function(assert) {
    // arrange
    this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable"
    });

    let $items = this.$element.children();
    let $dragItemElement = $items.eq(0);

    // assert
    assert.strictEqual($items.length, 3, "item count");

    // act
    pointerMock($dragItemElement).start().down().move(10, 0);

    // assert
    $items = this.$element.children();
    let $source = $items.eq(0);
    assert.strictEqual($items.length, 3, "item count");
    assert.ok($source.hasClass("dx-sortable-source-hidden"), "source item is hidden");
});

QUnit.test("Initial placeholder if dropFeedbackMode is indicate", function(assert) {
    // arrange
    let items,
        $placeholder,
        $dragItemElement;

    this.createSortable({
        dropFeedbackMode: "indicate"
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 25);

    // assert
    items = this.$element.children();
    assert.strictEqual(items.length, 3, "item count");
    assert.strictEqual($(".dx-sortable-placeholder").length, 0, "there isn't a placeholder");

    pointerMock($dragItemElement).up();

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 30);

    // assert
    items = this.$element.children();
    $placeholder = $(".dx-sortable-placeholder");
    assert.strictEqual(items.length, 3, "item count is not changed");
    assert.equal($placeholder.length, 1, "placeholder exists");
    assert.ok($placeholder.next().hasClass("dx-sortable-dragging"), "palceholder is before dragging");
    assert.equal($placeholder.get(0).style.height, "", "placeholder height");
    assert.equal($placeholder.get(0).style.width, "300px", "placeholder width");
    assert.equal($placeholder.get(0).style.transform, "translate(0px, 60px)", "placeholder position");
});

QUnit.test("Initial placeholder if allowDropInsideItem is true", function(assert) {
    // arrange
    let items,
        $placeholder,
        $dragItemElement;

    this.createSortable({
        allowDropInsideItem: true
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // act
    var pointer = pointerMock($dragItemElement).start().down(15, 15).move(0, 30);

    // assert
    items = this.$element.children();
    $placeholder = $(".dx-sortable-placeholder");
    assert.strictEqual(items.length, 3, "item count");
    assert.ok($placeholder.hasClass("dx-sortable-placeholder"), "element has placeholder class");
    assert.ok($placeholder.hasClass("dx-sortable-placeholder-inside"), "element has placeholder-inside class");
    assert.equal($placeholder.get(0).style.height, "30px", "placeholder height");
    assert.equal($placeholder.get(0).style.width, "300px", "placeholder width");
    assert.equal($placeholder.get(0).style.transform, "translate(0px, 30px)", "placeholder position");

    // act
    pointer.move(0, 15);

    // assert
    items = this.$element.children();
    $placeholder = $(".dx-sortable-placeholder");
    assert.strictEqual(items.length, 3, "item count");
    assert.equal($placeholder.length, 1, "placeholder exists");
    assert.notOk($placeholder.hasClass("dx-sortable-placeholder-inside"), "element has not placeholder-inside class");
    assert.equal($placeholder.get(0).style.height, "", "placeholder height");
    assert.equal($placeholder.get(0).style.width, "300px", "placeholder width");
    assert.equal($placeholder.get(0).style.transform, "translate(0px, 60px)", "placeholder position");
});

QUnit.test("Initial placeholder if dropFeedbackMode is indicate and itemOrientation is horiontal", function(assert) {
    // arrange
    let items,
        $placeholder,
        $dragItemElement;

    this.$element = $("#itemsHorizontal");

    this.createSortable({
        dropFeedbackMode: "indicate",
        itemOrientation: "horizontal"
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(30, 0);

    // assert
    items = this.$element.children();
    $placeholder = $(".dx-sortable-placeholder");
    assert.strictEqual(items.length, 3, "item count");
    assert.equal($placeholder.length, 1, "element has placeholder class");
    assert.equal($placeholder.get(0).style.height, "300px", "placeholder height style");
    assert.equal($placeholder.get(0).style.width, "", "placeholder width style");
    assert.equal($placeholder.get(0).style.transform, "translate(60px, 500px)", "placeholder position");
});

QUnit.test("Source classes toggling", function(assert) {
    // arrange
    this.createSortable({
        dropFeedbackMode: "push"
    });

    let items = this.$element.children(),
        $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down().move(10, 0);

    // assert
    items = this.$element.children();
    assert.ok(items.eq(0).hasClass("dx-sortable-source"), "element has source class");
    assert.ok(items.eq(0).hasClass("dx-sortable-source-hidden"), "element has source-hidden class");

    // act
    pointerMock($dragItemElement).up();

    // assert
    items = this.$element.children();
    assert.notOk(items.eq(0).hasClass("dx-sortable-source"), "element has not source class");
    assert.notOk(items.eq(0).hasClass("dx-sortable-source-hidden"), "element has not source-hidden class");
});

QUnit.test("Move items during dragging", function(assert) {
    // arrange
    let items,
        $item,
        $dragItemElement;

    this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "push"
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // assert
    assert.strictEqual(items.length, 3, "item count");

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 30);

    // assert
    items = this.$element.children();
    $item = items.eq(0);
    assert.strictEqual(items.length, 3, "item count");
    assert.strictEqual($item.attr("id"), "item1", "first item is a source");
    assert.ok($item.hasClass("dx-sortable-source-hidden"), "has source-hidden class");

    assert.strictEqual(items[0].style.transform, "", "items 1 is not moved");
    assert.strictEqual(items[1].style.transform, "translate(0px, -30px)", "items 2 is moved up");
    assert.strictEqual(items[2].style.transform, "", "items 3 is not moved");
});

QUnit.test("Drop when dropFeedbackMode is push", function(assert) {
    // arrange
    let items,
        $dragItemElement;

    this.createSortable({
        filter: ".draggable",
        moveItemOnDrop: true,
        dropFeedbackMode: "push"
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 30).up();

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(0).attr("id"), "item2", "second item");
    assert.strictEqual(items.eq(1).attr("id"), "item1", "first item");
    assert.strictEqual(items.eq(2).attr("id"), "item3", "third item");
});

QUnit.test("Drop when dropFeedbackMode is indicate", function(assert) {
    // arrange
    let items,
        $dragItemElement;

    this.createSortable({
        filter: ".draggable",
        moveItemOnDrop: true,
        dropFeedbackMode: "indicate"
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 30).up();

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(0).attr("id"), "item2", "second item");
    assert.strictEqual(items.eq(1).attr("id"), "item1", "first item");
    assert.strictEqual(items.eq(2).attr("id"), "item3", "third item");
});

QUnit.test("Remove placeholder after the drop end", function(assert) {
    // arrange
    this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate"
    });

    let items = this.$element.children(),
        $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 30);

    // assert
    assert.strictEqual($(".dx-sortable-placeholder").length, 1, "there is a placeholder element");

    // act
    pointerMock($dragItemElement).up();

    // assert
    assert.strictEqual($(".dx-sortable-placeholder").length, 0, "there isn't a placeholder element");
});

QUnit.test("The source item should be correct after drag and drop items", function(assert) {
    // arrange
    let items,
        $item;

    this.createSortable({
        filter: ".draggable"
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down().move(10, 0);

    // assert
    $item = items.eq(0);
    assert.ok($item.hasClass("dx-sortable-source"), "there is a source");
    assert.strictEqual($item.attr("id"), "item1", "source id");

    // arrange
    pointerMock(items.eq(0)).up();

    // act
    pointerMock(items.eq(1)).start().down().move(10, 0);

    $item = items.eq(1);
    assert.ok($item.hasClass("dx-sortable-source"), "there is a source");
    assert.strictEqual($item.attr("id"), "item2", "placeholder id");
});

QUnit.test("Dragging an item to the last position when there is ignored (not draggable) item", function(assert) {
    // arrange
    let pointer,
        items;

    this.$element.append("<div id='item4'></div>");
    this.createSortable({
        filter: ".draggable",
        moveItemOnDrop: true
    });

    items = this.$element.children();

    // assert
    assert.strictEqual(items.length, 4, "item count");

    // act
    pointer = pointerMock(items.eq(0)).start().down().move(0, 90);

    // assert
    items = this.$element.children();
    assert.ok(items.eq(0).hasClass("dx-sortable-source"), "source item");
    assert.strictEqual(items.eq(3).attr("id"), "item4", "ignored item");

    // act
    pointer.up();

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(2).attr("id"), "item1", "source item");
    assert.strictEqual(items.eq(3).attr("id"), "item4", "ignored item");
});

QUnit.test("Dragging an item to the last position when there is ignored (not draggable) item and dropFeedbackMode option is 'indicate'", function(assert) {
    // arrange
    let pointer,
        items;

    this.$element.append("<div id='item4'></div>");
    this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate",
        moveItemOnDrop: true
    });

    items = this.$element.children();

    // assert
    assert.strictEqual(items.length, 4, "item count");

    // act
    pointer = pointerMock(items.eq(0)).start().down().move(0, 90);

    // assert
    items = this.$element.children();
    assert.equal($(".dx-sortable-placeholder").length, 1, "placeholder exists");
    assert.strictEqual(items.eq(3).attr("id"), "item4", "ignored item");

    // act
    pointer.up();

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(2).attr("id"), "item1", "source item");
    assert.strictEqual(items.eq(3).attr("id"), "item4", "ignored item");
    assert.equal($(".dx-sortable-placeholder").length, 0, "placeholder removed");
});


QUnit.module("Events", crossComponentModuleConfig);

QUnit.test("onDragChange - check args when dragging an item down", function(assert) {
    // arrange
    let items,
        args,
        onDragChange = sinon.spy();

    this.createSortable({
        filter: ".draggable",
        onDragChange: onDragChange
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30);

    // assert
    args = onDragChange.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
});

QUnit.test("onDragChange - check args when dragging an item up", function(assert) {
    // arrange
    let items,
        args,
        onDragChange = sinon.spy();

    this.createSortable({
        filter: ".draggable",
        onDragChange: onDragChange
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(2)).start().down().move(0, 30);

    // assert
    args = onDragChange.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(2), "source element");
    assert.strictEqual(args[0].fromIndex, 2, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
});

QUnit.test("onDragChange - check args when dragging to last position", function(assert) {
    // arrange
    let items,
        args,
        onDragChange = sinon.spy();

    this.createSortable({
        filter: ".draggable",
        onDragChange: onDragChange
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 90);

    // assert
    args = onDragChange.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 2, "toIndex");
});

QUnit.test("'onDragChange' option changing", function(assert) {
    // arrange
    let args,
        items,
        onDragChange = sinon.spy();

    let sortableInstance = this.createSortable({
        filter: ".draggable"
    });

    items = this.$element.children();

    // act
    sortableInstance.option("onDragChange", onDragChange);

    // arrange
    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30);

    // assert
    args = onDragChange.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
});

QUnit.test("'onDragChange' event - not drag item when eventArgs.cancel is true", function(assert) {
    // arrange
    let items,
        $dragItemElement;

    this.createSortable({
        filter: ".draggable",
        onDragChange: function(e) {
            e.cancel = true;
        }
    });

    items = this.$element.children();
    $dragItemElement = items.eq(0);

    // act
    pointerMock($dragItemElement).start().down(15, 15).move(0, 30);

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(0).attr("id"), "item1", "first item");
    assert.strictEqual(items.eq(1).attr("id"), "item2", "second item");
    assert.strictEqual(items.eq(2).attr("id"), "item3", "third item");
});

QUnit.test("onDragEnd - check args when dragging an item down", function(assert) {
    // arrange
    let items,
        args,
        onDragEnd = sinon.spy();


    this.createSortable({
        filter: ".draggable",
        onDragEnd: onDragEnd
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30).up();

    // assert
    args = onDragEnd.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
    assert.strictEqual(args[0].dropInsideItem, false, "dropInsideItem is false");
});

QUnit.test("onDragEnd - check args when dragging an item up", function(assert) {
    // arrange
    let items,
        args,
        onDragEnd = sinon.spy();


    this.createSortable({
        filter: ".draggable",
        onDragEnd: onDragEnd
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(2)).start().down().move(0, 30).up();

    // assert
    args = onDragEnd.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(2), "source element");
    assert.strictEqual(args[0].fromIndex, 2, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
});

QUnit.test("onDragEnd - check args when dragging to last position", function(assert) {
    // arrange
    let items,
        args,
        onDragEnd = sinon.spy();

    this.createSortable({
        filter: ".draggable",
        onDragEnd: onDragEnd
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 90).up();

    // assert
    args = onDragEnd.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 2, "toIndex");
});

QUnit.test("onDragEnd with eventArgs.cancel is true - the draggable element should not change position", function(assert) {
    // arrange
    let items;

    this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate",
        moveItemOnDrop: true,
        onDragEnd: function(e) {
            e.cancel = true;
        }
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30).up();

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(0).attr("id"), "item1", "first item");
    assert.strictEqual(items.eq(1).attr("id"), "item2", "second item");
    assert.strictEqual(items.eq(2).attr("id"), "item3", "third item");
});

QUnit.test("The draggable element should not change position without moveItemOnDrop", function(assert) {
    // arrange
    let items;

    this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate"
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30).up();

    // assert
    items = this.$element.children();
    assert.strictEqual(items.eq(0).attr("id"), "item1", "first item");
    assert.strictEqual(items.eq(1).attr("id"), "item2", "second item");
    assert.strictEqual(items.eq(2).attr("id"), "item3", "third item");
});

QUnit.test("onDragEnd - check args when dragging inside item", function(assert) {
    // arrange
    let items,
        args,
        onDragEnd = sinon.spy();


    this.createSortable({
        allowDropInsideItem: true,
        onDragEnd: onDragEnd
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30).up();

    // assert
    args = onDragEnd.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
    assert.strictEqual(args[0].dropInsideItem, true, "dropInsideItem");
});

QUnit.test("onPlaceholderPrepared - check args when dragging", function(assert) {
    // arrange
    let items,
        args,
        onPlaceholderPrepared = sinon.spy();


    this.createSortable({
        filter: ".draggable",
        onPlaceholderPrepared: onPlaceholderPrepared,
        dropFeedbackMode: "indicate"
    });

    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30);

    // assert
    items = this.$element.children();
    args = onPlaceholderPrepared.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.ok(args[0].placeholderElement, "placeholder element exists");
    assert.ok(args[0].dragElement, "dragging element exists");
    assert.deepEqual($(args[0].placeholderElement).get(0), $("body").children(".dx-sortable-placeholder").get(0), "placeholder element");
    assert.deepEqual($(args[0].dragElement).get(0), $("body").children(".dx-sortable-dragging").get(0), "dragging element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
});

QUnit.test("'onPlaceholderPrepared' option changing", function(assert) {
    // arrange
    let args,
        items,
        onPlaceholderPrepared = sinon.spy();

    let sortableInstance = this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate"
    });

    items = this.$element.children();

    // act
    sortableInstance.option("onPlaceholderPrepared", onPlaceholderPrepared);

    // arrange
    items = this.$element.children();

    // act
    pointerMock(items.eq(0)).start().down(15, 15).move(0, 30);

    // assert
    items = this.$element.children();
    args = onPlaceholderPrepared.getCall(0).args;
    assert.deepEqual($(args[0].itemElement).get(0), items.get(0), "source element");
    assert.deepEqual($(args[0].placeholderElement).get(0), $("body").children(".dx-sortable-placeholder").get(0), "placeholder element");
    assert.deepEqual($(args[0].dragElement).get(0), $("body").children(".dx-sortable-dragging").get(0), "dragging element");
    assert.strictEqual(args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(args[0].toIndex, 1, "toIndex");
});

QUnit.test("onAdd - check args", function(assert) {
    // arrange
    let onAddSpy = sinon.spy();

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true,
        onAdd: onAddSpy
    }, $("#items2"));

    // act
    let $sourceElement = sortable1.$element().children().eq(1);
    pointerMock($sourceElement).start({ x: 0, y: 35 }).down().move(350, 30).move(50, 0).up();

    // assert
    assert.strictEqual(onAddSpy.callCount, 1, "onAdd is called");
    assert.deepEqual(onAddSpy.getCall(0).args[0].fromComponent, sortable1, "sourceComponent");
    assert.deepEqual(onAddSpy.getCall(0).args[0].toComponent, sortable2, "component");
    assert.strictEqual(onAddSpy.getCall(0).args[0].fromIndex, 1, "fromIndex");
    assert.strictEqual(onAddSpy.getCall(0).args[0].toIndex, 2, "toIndex");
    assert.strictEqual($(onAddSpy.getCall(0).args[0].itemElement).get(0), $sourceElement.get(0), "itemElement");
    assert.strictEqual($(sortable2.element()).children("#item2").length, 1, "item is added");
});

QUnit.test("onAdd - not add item when eventArgs.cancel is true", function(assert) {
    // arrange
    let onAddSpy = sinon.spy((e) => { e.cancel = true; });

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true,
        onAdd: onAddSpy
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    assert.strictEqual(onAddSpy.callCount, 1, "onAdd is called");
    assert.strictEqual($(sortable2.element()).children("#item1").length, 0, "item isn't added");
});

QUnit.test("onAdd - not add item without moveItemOnDrop", function(assert) {
    // arrange
    let onAddSpy = sinon.spy();

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        onAdd: onAddSpy
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    assert.strictEqual(onAddSpy.callCount, 1, "onAdd is called");
    assert.strictEqual($(sortable2.element()).children("#item1").length, 0, "item isn't added");
});

QUnit.test("onRemove - check args", function(assert) {
    // arrange
    let onRemoveSpy = sinon.spy();

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        onRemove: onRemoveSpy
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        moveItemOnDrop: true,
        group: "shared"
    }, $("#items2"));

    // act
    let $sourceElement = sortable1.$element().children().eq(1);
    pointerMock($sourceElement).start({ x: 0, y: 35 }).down().move(350, 30).move(50, 0).up();

    // assert
    assert.strictEqual(onRemoveSpy.callCount, 1, "onRemove is called");
    assert.deepEqual(onRemoveSpy.getCall(0).args[0].toComponent, sortable2, "targetComponent");
    assert.deepEqual(onRemoveSpy.getCall(0).args[0].fromComponent, sortable1, "component");
    assert.strictEqual(onRemoveSpy.getCall(0).args[0].fromIndex, 1, "fromIndex");
    assert.strictEqual(onRemoveSpy.getCall(0).args[0].toIndex, 2, "toIndex");
    assert.strictEqual($(onRemoveSpy.getCall(0).args[0].itemElement).get(0), $sourceElement.get(0), "itemElement");
    assert.strictEqual($(sortable1.element()).children("#item2").length, 0, "item is removed");
});

QUnit.test("onRemove - not add item when eventArgs.cancel is true", function(assert) {
    // arrange
    let onRemoveSpy = sinon.spy((e) => { e.cancel = true; });

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        onRemove: onRemoveSpy
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    assert.strictEqual(onRemoveSpy.callCount, 1, "onRemove is called");
    assert.strictEqual($(sortable1.element()).children("#item1").length, 1, "item isn't removed");
    assert.strictEqual($(sortable1.element()).children("#item1").attr("class"), "draggable", "source item hasn't dx-sortable-source class");
    assert.strictEqual($(sortable2.element()).children("#item1").attr("class"), "draggable", "cloned source item hasn't dx-sortable-source class");
});

QUnit.test("onRemove - not add item without moveItemOnDrop", function(assert) {
    // arrange
    let onRemoveSpy = sinon.spy();

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        onRemove: onRemoveSpy
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    assert.strictEqual(onRemoveSpy.callCount, 1, "onRemove is called");
    assert.strictEqual($(sortable1.element()).children("#item1").length, 1, "item isn't removed");
    assert.strictEqual($(sortable1.element()).children("#item1").attr("class"), "draggable", "source item hasn't dx-sortable-source class");
    assert.strictEqual($(sortable2.element()).children("#item1").length, 0, "source item is not added to second sortable");
});

QUnit.test("onReorder - check args", function(assert) {
    // arrange
    let onReorderSpy = sinon.spy();

    let sortable = this.createSortable({
        filter: ".draggable",
        onReorder: onReorderSpy,
        moveItemOnDrop: true
    }, $("#items"));

    // act
    let $sourceElement = sortable.$element().children().eq(0);

    pointerMock($sourceElement).start().down().move(0, 40).move(0, 10).up();

    // assert
    assert.strictEqual(onReorderSpy.callCount, 1, "onRemove is called");
    assert.strictEqual(onReorderSpy.getCall(0).args[0].fromIndex, 0, "fromIndex");
    assert.strictEqual(onReorderSpy.getCall(0).args[0].toIndex, 1, "toIndex");
    assert.strictEqual($(onReorderSpy.getCall(0).args[0].itemElement).get(0), $sourceElement.get(0), "itemElement");
});

QUnit.test("onDragMove, onDragEnd, onDragChange, onReorder - check itemData arg", function(assert) {
    // arrange
    let itemData = { test: true },
        options = {
            filter: ".draggable",
            onDragStart: function(e) {
                e.itemData = itemData;
            },
            onDragMove: sinon.spy(),
            onDragEnd: sinon.spy(),
            onDragChange: sinon.spy(),
            onReorder: sinon.spy()
        };

    let sortable = this.createSortable(options, $("#items"));

    // act
    let $sourceElement = sortable.$element().children().eq(0);
    pointerMock($sourceElement).start().down().move(0, 25).move(0, 5).up();

    // assert
    assert.deepEqual(options.onDragMove.getCall(0).args[0].itemData, itemData, "itemData in onDragMove event arguments");
    assert.deepEqual(options.onDragEnd.getCall(0).args[0].itemData, itemData, "itemData in onDragEnd event arguments");
    assert.deepEqual(options.onDragChange.getCall(0).args[0].itemData, itemData, "itemData in onDragChange event arguments");
    assert.deepEqual(options.onReorder.getCall(0).args[0].itemData, itemData, "itemData in onReorder event arguments");
});

QUnit.test("onAdd, onRemove - check itemData arg", function(assert) {
    // arrange
    let itemData = { test: true },
        onAddSpy = sinon.spy(),
        onRemoveSpy = sinon.spy();

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        onDragStart: function(e) {
            e.itemData = itemData;
        },
        onRemove: onRemoveSpy
    }, $("#items"));

    this.createSortable({
        filter: ".draggable",
        group: "shared",
        onAdd: onAddSpy
    }, $("#items2"));

    // act
    let $sourceElement = sortable1.$element().children().eq(1);
    pointerMock($sourceElement).start({ x: 0, y: 35 }).down().move(350, 30).move(50, 0).up();

    // assert
    assert.deepEqual(onAddSpy.getCall(0).args[0].itemData, itemData, "itemData in onDragMove event arguments");
    assert.deepEqual(onRemoveSpy.getCall(0).args[0].itemData, itemData, "itemData in onDragEnd event arguments");
});


QUnit.module("Cross-Component Drag and Drop", crossComponentModuleConfig);

QUnit.test("Dragging item to another the sortable widget", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 1, "first list - first item is not removed");
    assert.strictEqual(items2.filter("#item1").length, 0, "second list - first item of the first list was not added");

    assert.strictEqual(items1[0].style.transform, "", "items1 1 is not moved");
    assert.strictEqual(items1[1].style.transform, "translate(0px, -30px)", "items1 2 is moved up");
    assert.strictEqual(items1[2].style.transform, "translate(0px, -30px)", "items1 3 is moved up");

    assert.strictEqual(items2[0].style.transform, "translate(0px, 30px)", "items2 1 is moved down");
    assert.strictEqual(items2[1].style.transform, "translate(0px, 30px)", "items2 2 is moved down");
    assert.strictEqual(items2[2].style.transform, "translate(0px, 30px)", "items2 3 is moved down");
});

QUnit.test("Dragging item to another the sortable widget if template contains scrollable", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        template: function() {
            return $("<div>").css({
                width: 100,
                height: 100
            }).dxSortable();
        },
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 1, "first list - first item is not removed");
    assert.strictEqual(items2.filter("#item1").length, 0, "second list - first item of the first list was not added");

    assert.strictEqual(items1[0].style.transform, "", "items1 1 is not moved");
    assert.strictEqual(items1[1].style.transform, "translate(0px, -30px)", "items1 2 is moved up");
    assert.strictEqual(items1[2].style.transform, "translate(0px, -30px)", "items1 3 is moved up");

    assert.strictEqual(items2[0].style.transform, "translate(0px, 30px)", "items2 1 is moved down");
    assert.strictEqual(items2[1].style.transform, "translate(0px, 30px)", "items2 2 is moved down");
    assert.strictEqual(items2[2].style.transform, "translate(0px, 30px)", "items2 3 is moved down");
});

QUnit.test("Dragging item to another the sortable widget without free space", function(assert) {
    // arrange
    $("#items2").css("height", "");
    $("#items2").children().last().css("margin", 1);


    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));


    // act
    let pointer = pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    assert.strictEqual(sortable2.$element().children().last()[0].style.marginBottom, "29px", "items2 last item has margin bottom");

    // act
    pointer.up();

    // assert
    assert.strictEqual(sortable2.$element().children().last()[0].style.marginBottom, "1px", "items2 last item margin bottom is restored");
});


QUnit.test("Dragging item with dropFeedbackMode push to another the sortable widget with dropFeedbackMode indicate", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "indicate",
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 1, "first list - first item is exists");
    assert.strictEqual(items1.filter("#item1").hasClass("dx-sortable-source-hidden"), true, "first list - first item is hidden");
    assert.strictEqual(items2.filter("#item1").length, 0, "second list - first item of the first list is not added");
    assert.strictEqual($("body").children(".dx-sortable-placeholder").length, 1, "placeholder is in body");
});

QUnit.test("Dragging item to another the sortable widget when group as object", function(assert) {
    // arrange
    let items1,
        items2,
        group = {};

    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: group
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: group
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");

    assert.strictEqual(items1[0].style.transform, "", "items1 1 is not moved");
    assert.strictEqual(items1[1].style.transform, "translate(0px, -30px)", "items1 2 is moved up");
    assert.strictEqual(items1[2].style.transform, "translate(0px, -30px)", "items1 3 is moved up");

    assert.strictEqual(items2[0].style.transform, "translate(0px, 30px)", "items2 1 is moved down");
    assert.strictEqual(items2[1].style.transform, "translate(0px, 30px)", "items2 2 is moved down");
    assert.strictEqual(items2[2].style.transform, "translate(0px, 30px)", "items2 3 is moved down");

});

QUnit.test("Dragging item should not work when another the sortable widget does not have a group", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable"
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");
});

QUnit.test("Dropping item to another the sortable widget", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 2, "first list - item count");
    assert.strictEqual(items2.length, 4, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 0, "first list - first item is removed");
    assert.strictEqual(items2.filter("#item1").length, 1, "second list - first item of the first list was added");
});

QUnit.test("Dragging item to another the sortable widget with dropFeedbackMode indicate", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        dropFeedbackMode: "push",
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        dropFeedbackMode: "indicate",
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");
    assert.ok($("body").children(".dx-sortable-placeholder").length, 1, "placeholder is in body");
});

QUnit.test("Dropping item to another the sortable widget with dropFeedbackMode indicate", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        dropFeedbackMode: "indicate"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        dropFeedbackMode: "indicate",
        moveItemOnDrop: true
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 2, "first list - item count");
    assert.strictEqual(items2.length, 4, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 0, "first list - first item is removed");
    assert.strictEqual(items2.filter("#item1").length, 1, "second list - first item of the first list was added");
});

QUnit.test("Dragging items between sortable widgets", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    items1 = $(sortable1.$element()).children();
    items2 = $(sortable2.$element()).children();
    assert.strictEqual(items1.length, 2, "first list - item count");
    assert.strictEqual(items2.length, 4, "second list - item count");

    // act
    pointerMock(sortable2.$element().children().eq(1)).start({ x: 304, y: 0 }).down().move(-250, 30).move(-50, 0).up();

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 3, "second list - item count");
    assert.strictEqual(items1.eq(0).attr("id"), "item2", "first list - first item");
    assert.strictEqual(items1.eq(1).attr("id"), "item4", "first list - second item");
    assert.strictEqual(items2.eq(0).attr("id"), "item1", "second list - first item");
    assert.strictEqual(items2.eq(1).attr("id"), "item5", "second list - second item");
});

QUnit.test("Update item points when dragging an item to another the sortable widget if dropFeedbackMode is push", function(assert) {
    // arrange
    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(350, 0).move(50, 0);

    // assert
    var itemPoints = sortable2.option("itemPoints");
    assert.equal(itemPoints.length, 4, "point count");
    assert.deepEqual(itemPoints[0].top, 30, "top of the first point");
    assert.deepEqual(itemPoints[0].index, 0, "index of the first point");
    assert.deepEqual(itemPoints[1].top, 60, "top of the first point");
    assert.deepEqual(itemPoints[1].index, 1, "index of the first point");
    assert.deepEqual(itemPoints[2].top, 90, "top of the second point");
    assert.deepEqual(itemPoints[2].index, 2, "index of the second point");
    assert.deepEqual(itemPoints[3].top, 120, "top of the third point");
    assert.deepEqual(itemPoints[3].index, 3, "index of the third point");
});

QUnit.test("Drag and drop item from draggable to sortable", function(assert) {
    // arrange
    let items1, items2;

    let draggable = this.createDraggable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true
    }, $("#items2"));

    // act
    pointerMock(draggable.$element().children().eq(0)).start().down().move(350, 0).move(50, 0).up();

    // assert
    items1 = draggable.$element().children();
    items2 = sortable.$element().children();
    assert.strictEqual(items1.length, 2, "first list - item count");
    assert.strictEqual(items2.length, 4, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 0, "first list - draggable item is removed");
    assert.strictEqual(items2.filter("#item1").length, 1, "second list - item from second list");
    assert.strictEqual(items2.first().attr("id"), "item1", "second list - new item in first position");
});

QUnit.test("Drag and drop item from sortable to draggable should not move item", function(assert) {
    // arrange
    let items1, items2;

    let draggable = this.createDraggable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable.$element().children().eq(0)).start({ x: 304, y: 0 }).down().move(-250, 0).move(-50, 0).up();

    // assert
    items1 = draggable.$element().children();
    items2 = sortable.$element().children();
    assert.strictEqual(items1.length, 3, "first list items are not changed");
    assert.strictEqual(items2.length, 3, "second list items are not changed");
});

QUnit.test("Drag and drop item from sortable to draggable with drop handler", function(assert) {
    // arrange
    let items1, items2;

    let draggable = this.createDraggable({
        filter: ".draggable",
        group: "shared",
        onDrop: function(e) {
            if(e.fromComponent !== e.toComponent) {
                $(e.element).append(e.itemElement);
            }
        }
    }, $("#items"));

    let sortable = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items2"));

    // act
    pointerMock(sortable.$element().children().eq(0)).start({ x: 304, y: 0 }).down().move(-250, 0).move(-50, 0).up();

    // assert
    items1 = draggable.$element().children();
    items2 = sortable.$element().children();
    assert.strictEqual(items1.length, 4, "first list - item count");
    assert.strictEqual(items2.length, 2, "second list - item count");
    assert.strictEqual(items1.filter("#item4").length, 1, "first list - item from second list");
    assert.strictEqual(items1.last().attr("id"), "item4", "first list - new item in last position");
    assert.strictEqual(items2.filter("#item4").length, 0, "second list - draggable item is removed");
});

QUnit.test("Drag and drop item to empty sortable", function(assert) {
    // arrange
    let items1, items2;

    let sortable1 = this.createSortable({
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        filter: ".draggable",
        group: "shared",
        moveItemOnDrop: true
    }, $("#items3"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(0, 300).move(0, 10).up();

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 2, "first list - item count");
    assert.strictEqual(items2.length, 1, "second list - item count");
    assert.strictEqual(items1.filter("#item1").length, 0, "first list - draggable item is removed");
    assert.strictEqual(items2.filter("#item1").length, 1, "second list - item from first list");
});

QUnit.test("Placeholder should not visible on drag item to empty sortable", function(assert) {
    // arrange
    let sortable1 = this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate",
        group: "shared"
    }, $("#items"));

    this.createSortable({
        filter: ".draggable",
        dropFeedbackMode: "indicate",
        group: "shared"
    }, $("#items3"));

    // act
    pointerMock(sortable1.$element().children().eq(0)).start().down().move(0, 300).move(0, 10);

    // assert
    assert.strictEqual($(".dx-sortable-placeholder").length, 2, "placeholders exist");
    assert.strictEqual($(".dx-sortable-placeholder").eq(0).is(":visible"), false, "placeholder 1 is not visible");
    assert.strictEqual($(".dx-sortable-placeholder").eq(1).is(":visible"), false, "placeholder 2 is not visible");
});

QUnit.test("Dragging an item to another sortable and back when it is alone in the collection", function(assert) {
    // arrange
    let items1, items2;

    $("#items3").append("<div id='item7' class='draggable' style='width: 300px; height: 30px; background: blue;'>item7</div>");

    let sortable1 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items"));

    let sortable2 = this.createSortable({
        dropFeedbackMode: "push",
        filter: ".draggable",
        group: "shared"
    }, $("#items3"));

    // act
    let pointer = pointerMock(sortable2.$element().children().eq(0)).start({ x: 0, y: 310 }).down().move(0, -300).move(0, -10);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 1, "second list - item count");

    assert.strictEqual(items1[0].style.transform, "translate(0px, 30px)", "items1 1 is moved down");
    assert.strictEqual(items1[1].style.transform, "translate(0px, 30px)", "items1 2 is moved down");
    assert.strictEqual(items1[2].style.transform, "translate(0px, 30px)", "items1 3 is moved down");

    assert.strictEqual(items2[0].style.transform, "", "items2 1 is not moved");
    assert.strictEqual(items2.first().attr("id"), "item7", "source item position is not changed");
    assert.strictEqual(items2.hasClass("dx-sortable-source-hidden"), true, "source item is hidden");

    // act
    pointer.move(0, 300).move(0, 10);

    // assert
    items1 = sortable1.$element().children();
    items2 = sortable2.$element().children();
    assert.strictEqual(items1.length, 3, "first list - item count");
    assert.strictEqual(items2.length, 1, "second list - item count");
    assert.strictEqual(items2.first().attr("id"), "item7", "second list - first item");
});
