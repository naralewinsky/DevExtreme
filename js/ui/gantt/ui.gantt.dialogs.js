import Popup from "../popup";
import Form from "../form";

export class GanttDialog {
    constructor(owner, $element) {
        this._popupInstance = owner._createComponent($element, Popup);

        this.infoMap = {
            TaskEdit: TaskEditDialogInfo,
            Resources: ResourcesEditDialogInfo
        };
    }
    _apply() {
        const result = this._dialogInfo.getResult();
        this._callback(result);
        this.hide();
    }

    show(name, parameters, callback) {
        this._callback = callback;

        if(!this.infoMap[name]) {
            return;
        }
        this._dialogInfo = new this.infoMap[name](parameters, this._apply.bind(this), this.hide.bind(this));
        this._popupInstance.option({
            title: this._dialogInfo.getTitle(),
            toolbarItems: this._dialogInfo.getToolbarItems(),
            maxWidth: this._dialogInfo.getMaxWidth(),
            height: this._dialogInfo.getHeight(),
            contentTemplate: this._dialogInfo.getContentTemplate()
        });
        this._popupInstance.show();
    }
    hide() {
        this._popupInstance.hide();
        delete this._dialogInfo;
    }
}

class DialogInfoBase {
    constructor(parameters, applyAction, hideAction) {
        this._parameters = parameters;
        this._applyAction = applyAction;
        this._hideAction = hideAction;
    }

    _getFormItems() { return {}; }
    _updateParameters() {}
    _getOkToolbarItem() {
        return {
            widget: "dxButton",
            location: "after",
            toolbar: "bottom",
            options: {
                text: "Ok",
                onClick: this._applyAction
            }
        };
    }
    _getCancelToolbarItem() {
        return {
            widget: "dxButton",
            location: "after",
            toolbar: "bottom",
            options: {
                text: "Cancel",
                onClick: this._hideAction
            }
        };
    }

    getTitle() { return ""; }
    getToolbarItems() { return [ this._getOkToolbarItem(), this._getCancelToolbarItem()]; }
    getMaxWidth() { return 400; }
    getHeight() { return "auto"; }
    getContentTemplate() {
        return (content) => {
            this._form = new Form(content, {
                formData: this._parameters,
                items: this._getFormItems()
            });
            return content;
        };
    }
    getResult() {
        const formData = this._form.option("formData");
        this._updateParameters(formData);
        return this._parameters;
    }
}

class TaskEditDialogInfo extends DialogInfoBase {
    getTitle() { return "Task Information"; }
    _getFormItems() {
        return [{
            dataField: "title",
            editorType: "dxTextBox",
            label: { text: "Title" }
        }, {
            dataField: "start",
            editorType: "dxDateBox",
            label: { text: "Start" },
            editorOptions: {
                type: "datetime",
                width: "100%"
            }
        }, {
            dataField: "end",
            editorType: "dxDateBox",
            label: { text: "End" },
            editorOptions: {
                type: "datetime",
                width: "100%"
            }
        }, {
            dataField: "progress",
            editorType: "dxNumberBox",
            label: { text: "Progress" },
            editorOptions: {
                showSpinButtons: true,
                min: 0,
                max: 100
            }
        }, {
            dataField: "assigned.items",
            editorType: "dxTagBox",
            label: { text: "Resources" },
            editorOptions: {
                dataSource: this._parameters.resources.items,
                displayExpr: "text",
                buttons: [{
                    name: "editResources",
                    location: "after",
                    options: {
                        text: "...",
                        hint: "Edit Resource List",
                        onClick: () => {
                            this._parameters.showResourcesDialogCommand.execute();
                        }
                    }
                }]
            }
        }];
    }
    _updateParameters(formData) {
        this._parameters.title = formData.title;
        this._parameters.start = formData.start;
        this._parameters.end = formData.end;
        this._parameters.progress = formData.progress;
        this._parameters.assigned = formData.assigned;
    }
}

class ResourcesEditDialogInfo extends DialogInfoBase {
    getTitle() { return "Resources"; }
    _getFormItems() {
        return [{
            label: { visible: false },
            dataField: "resources.items",
            editorType: "dxList",
            editorOptions: {
                allowItemDeleting: true,
                itemDeleteMode: "static",
                selectionMode: "none",
                items: this._parameters.resources.items,
                height: 250,
                noDataText: "No resources",
                onInitialized: (e) => { this.list = e.component; },
                onItemDeleted: (e) => { this._parameters.resources.remove(e.itemData); }
            }
        }, {
            label: { visible: false },
            editorType: "dxTextBox",
            editorOptions: {
                onInitialized: (e) => { this.textBox = e.component; },
                onInput: (e) => {
                    const addButton = e.component.getButton("addResource");
                    const resourceName = e.component.option("text");
                    addButton.option("disabled", resourceName.length === 0);
                },
                buttons: [{
                    name: "addResource",
                    location: "after",
                    options: {
                        text: "Add",
                        disabled: true,
                        onClick: (e) => {
                            const newItem = this._parameters.resources.createItem();
                            newItem.text = this.textBox.option("text");
                            this._parameters.resources.add(newItem);
                            this.list.option("items", this._parameters.resources.items);
                            this.list.scrollToItem(newItem);
                            this.textBox.reset();
                            e.component.option("disabled", true);
                        }
                    }
                }]
            }
        }];
    }
}
