import { LightningElement, track, api } from 'lwc';

export default class ReusableVisualPicker extends LightningElement {
    @track showSerializedSearch = false;
    @track showNonSerializedSearch = false;
    @track showVisualPicker = true; // Controls visibility of visual picker options
    @api selectedPickerId = "nonSerializedProduct";

    @track productOptions = [
        {   
            id: 'serializedProduct',
            name: 'Serialized Products',
            label: 'Serialized Products',
            description: 'Select this for Serialized Products'
        },
        {   
            id: 'nonSerializedProduct',
            name: 'NonSerialized Products',
            label: 'Non-Serialized Products',
            description: 'Select this for Non-Serialized Products'
        }
    ];

    handleSelect(event) {
        const selectedOption = event.detail.id;
        this.showVisualPicker = false; // Hide visual picker options on selection
        this.showSerializedSearch = selectedOption === 'serializedProduct';
        this.showNonSerializedSearch = selectedOption === 'nonSerializedProduct';
        this.selectedPickerId = event.detail.id;
    }

    previousHandler() {
        // Reset to show the visual picker options again
        this.showVisualPicker = true;
        this.showSerializedSearch = false;
        this.showNonSerializedSearch = false;
    }
}