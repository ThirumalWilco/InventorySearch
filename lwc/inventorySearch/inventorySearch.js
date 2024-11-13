import { LightningElement, api } from 'lwc';
export default class InventorySearch extends LightningElement {
    @api pickerInputId = 'visual-picker-94';
    @api pickerInputName = 'example-unique-name-36';
    @api pickerInputValue;
    @api defaultPickerText = 'Default picker text';
    @api defaultPickerBody = 'Deafult picker body';
    @api pickerChecked;
    @api pickerType = 'checkbox';
    @api pickerSize = 'slds-visual-picker slds-visual-picker_medium';
    
    handleSelect(event){
        this.pickerInputValue = event.target.checked;
        this.pickerChecked = event.target.checked;
        // Creates the event
        const selectedEvent = new CustomEvent('valueselected', {
            detail: { 
                value: event.target.checked, 
                id: this.pickerInputId 
            }
        });
        //dispatching the custom event
        this.dispatchEvent(selectedEvent);        
    }
}