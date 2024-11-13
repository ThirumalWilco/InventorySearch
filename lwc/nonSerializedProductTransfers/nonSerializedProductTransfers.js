import { LightningElement,api,wire,track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from "@salesforce/apex";
import getProductItems from '@salesforce/apex/NonSerializedProductTransferController.getProductItems'
import getDestinationLocationName from '@salesforce/apex/NonSerializedProductTransferController.getDestinationLocationName';
import createProductTransferRecords from '@salesforce/apex/NonSerializedProductTransferController.createProductTransferRecords';
import searchProductItems from '@salesforce/apex/NonSerializedProductTransferController.searchProductItems';
import getProductItemLocations from '@salesforce/apex/NonSerializedProductTransferController.getProductItemLocations';
import { getObjectInfo,getPicklistValues } from "lightning/uiObjectInfoApi";
import PRODUCT_OBJECT from "@salesforce/schema/Product2";
import LOCATION_OBJECT from "@salesforce/schema/Location";
import PRODUCT_FAMILY from "@salesforce/schema/Product2.Family";
import LOCATION_TYPE from "@salesforce/schema/Location.LocationType";

export default class NonSerializedProductTransfers extends NavigationMixin(LightningElement) {
    @track sortBy;
    @track sortDirection;
    isRowsSelected = false;
    productName='';
    locationName='';
    data;
    error;
    selectedData = [];
    selectedLocations = [];
    selectedLocationIDs = [];
    selectedProductItemIDs = [];
    destinationLocation;
    destinationLocationName;
    @track isShowModal = false;
    @track isShowCreatePT = false;
    quantityToBeSent = {};
    wrapperData = [];
    draftValuesList=[];
    draftValues = [];
    productTransferData =[];
    locationTypeOptions;
    productFamilyOptions;
    selectedProductFamily='';
    selectedLocationType='';
    productItemNumber ='';
    draftValuesMap ={};
    productRecordTypeId;
    locationRecordTypeId;
	@track allProductFamilyValues=[];
    @api productFamilyOptionsMaster;
    @track allLocationTypeValues=[];
    @api locationTypeOptionsMaster;
    wiredData;
    productTransferUrl;
    selectedDataSize;
    @track mapMarkers=[];
    @track isMapVisible =false;
    @track mapButton = 'Show Map';

    @api
    get columns() {
        return [
            {
                label: 'Product Item Number',
                fieldName: 'productItemLink',
                type: 'url',
                typeAttributes: { label: {fieldName : 'ProductItemNumber' }, target: '_blank'},
                sortable: "true"
            },
            {
                label: 'Quantity On Hand',
                fieldName: 'QuantityOnHand',
                sortable: "true"
            },   
            {
                label: 'Product Name',
                fieldName: 'productLink',
                sortable: "true",
                type: 'url',
                typeAttributes: { label: { fieldName: 'ProductName' }, target: '_blank' }
            },
            {
                label: 'Product Family',
                fieldName: 'ProductFamily',
                sortable: "true"
            },
            { 
                label: 'Source Location', 
                sortable: "true",
                fieldName: 'locationLink',
                type: 'url',
                typeAttributes: { label: { fieldName: 'LocationName' }, target: '_blank' } 
            },
            {
                label: 'Location Type',
                fieldName: 'LocationType',
                sortable: "true"
            },         
        ]
    }

    @api
    get productTransferColumns(){
        return [
            { label: 'Product Item Number', fieldName: 'ProductItemNumber', type: 'text', wrapText: true },
            { label: 'Product Name', fieldName: 'ProductName', type: 'text', wrapText: true },
            { label: 'Quantity On Hand', fieldName: 'QuantityOnHand', type: 'number', wrapText: true },
            { label: 'Source Location', fieldName: 'LocationName', type: 'text', wrapText: true },
            { label: 'Destination Location', fieldName: 'DestinationLocationName', type: 'text', wrapText: true },
            {
                label: 'Quantity Sent',
                fieldName: 'QuantitySent',
                type: 'number',
                editable: true // Editable field for Quantity Sent
            }
        ]
    }


    showDestinationModalBox() {  // Show Destination Modal
        this.isShowModal = true;
    }

    hideDestinationModalBox() {  // Hide Destination Modal
        this.isShowModal = false;
    }

    showCreatePT() {  // Show Create Product Transfer Modal
        this.isShowCreatePT = true;
    }

    hideCreatePT() {  // Hide Create Product Transfer Modal
        this.isShowCreatePT = false;
        this.hideDestinationModalBox();
    }

    @wire(getObjectInfo, { objectApiName: PRODUCT_OBJECT })
    productObject({ error, data }) {
        if (data) {
            this.productRecordTypeId = data.defaultRecordTypeId;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.productRecordTypeId = undefined;
        }
    }

    @wire(getObjectInfo, { objectApiName: LOCATION_OBJECT })
    locationObject({ error, data }) {
        if (data) {
            this.locationRecordTypeId = data.defaultRecordTypeId;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.locationRecordTypeId = undefined;
        }
    }

    @wire(getPicklistValues, { recordTypeId: '$productRecordTypeId', fieldApiName: PRODUCT_FAMILY })
    picklistProductFamilyResults({ error, data }) {
      if (data) {
        this.productFamilyOptions = data.values;
		this.productFamilyOptionsMaster = data.values;
        this.error = undefined;
      } else if (error) {
        this.error = error;
        this.selectedProductFamily = undefined;
      }
    }

    @wire(getPicklistValues, { recordTypeId: '$locationRecordTypeId', fieldApiName: LOCATION_TYPE })
    picklistLocationTypeResults({ error, data }) {
      if (data) {
        this.locationTypeOptions = data.values;
		this.locationTypeOptionsMaster = data.values;
        this.error = undefined;
      } else if (error) {
        this.error = error;
        this.selectedLocationType = undefined;
      }
    }

    doSorting(event) {
        this.sortBy = event.detail.fieldName;
        this.sortDirection = event.detail.sortDirection;
        this.sortData(this.sortBy, this.sortDirection);
    }

    sortData(fieldname, direction) {
        let parseData = JSON.parse(JSON.stringify(this.data));
        // Return the value stored in the field
        let keyValue = (a) => {
            return a[fieldname];
        };
        // cheking reverse direction
        let isReverse = direction === 'asc' ? 1: -1;
        // sorting data
        parseData.sort((x, y) => {
            x = keyValue(x) ? keyValue(x) : ''; // handling null values
            y = keyValue(y) ? keyValue(y) : '';
            // sorting values based on direction
            return isReverse * ((x > y) - (y > x));
        });
        this.data = parseData;
    }

    handleSave(event){
        event.preventDefault();
        // console.log('Draft Values before Save:', JSON.stringify(this.draftValues));
        this.draftValuesList = [];
        let tempDVMap = {...this.draftValuesMap};
        // console.log('TempDVMap ---',JSON.stringify(tempDVMap));
        let keys = Object.keys(tempDVMap);
        let values = Object.values(tempDVMap);
        // console.log('Keys->',JSON.stringify(keys));
        // console.log('Values->',JSON.stringify(values));
        keys.forEach( key => {
            let tmpObj = {};
            tmpObj['ProductItemNumber'] = key,
            tmpObj['QuantitySent'] = tempDVMap[key];
            this.draftValuesList.push(tmpObj);
            // console.log('tmpObj ->'+JSON.stringify(tmpObj));
        })
        // console.log('Draft Values List ->',JSON.stringify(this.draftValuesList))

        // If no changes were made
        if (!this.draftValuesList || this.draftValuesList.length === 0) {
                this.showToast('Error', 'No values were changed. Please update the values.', 'error');
                return;
        }

        // Validate the updated QuantitySent values
        let isValid = true;
        this.draftValuesList.forEach(item => {
            const originalItem = this.getItemByProductNumber(item.ProductItemNumber);
            // console.log('Original Item ---'+JSON.stringify(originalItem))
            // console.log('Item ->'+JSON.stringify(item))
            if (item.QuantitySent <= 0 || item.QuantitySent > originalItem.QuantityOnHand) {
                if(item.QuantitySent <= 0){
                    this.showToast('Error', 'Quantity Sent should be greater than 0.', 'error');
                }
                else if(item.QuantitySent > originalItem.QuantityOnHand){
                    this.showToast('Error', 'Quantity Sent should not be more than Quantity on Hand.', 'error');
                }
                isValid = false;
            }
        });

        this.selectedDataSize = this.selectedProductItemIDs.length;
        
        // console.log('Selected Data Size ->',this.selectedProductItemIDs.length);

        // console.log('Total Draft Values->',JSON.stringify(this.draftValues));

        // console.log('Draft Values Map ->', JSON.stringify(this.draftValuesMap));
 
            
        if(this.draftValuesList.length != this.selectedDataSize){
            isValid = false;
            this.showToast('Error', 'Please provide the Quantity On Hand for all the selected Product Items.', 'error');
        }
        else if(isValid){
            // Update productItemDetails with the new QuantitySent values
            this.updateProductItemDetails(this.draftValuesList);

            // Prepare data for Apex call
            let productTransfers = this.productTransferData.map(item => ({
                product2Id : item.Product2Id,
                sourceProductItemId: item.Id, 
                destinationLocationId: this.destinationLocation,
                quantitySent: item.QuantitySent
                
            }))
            // console.log('Prepared Product Transfers Data:', JSON.stringify(productTransfers));

            let productTransferListView = {
                type: 'standard__objectPage',
                attributes: {
                    objectApiName: 'ProductTransfer',
                    actionName: 'list'
                },
                state: {
                    filterName: 'Recent'
                },
            };
            this[NavigationMixin.GenerateUrl](productTransferListView).then( (url) => {
                    this.productTransferUrl = url;
                    // console.log('URL ----'+this.productTransferUrl);
                })

            // Call Apex to create ProductTransfer records
            createProductTransferRecords({ wrapperData: productTransfers })
            .then(() => {
                this.showToast('Success', '{0} Product Transfer Records created successfully! {1}',
                    'success',[
                    this.selectedDataSize.toString(),
                        {
                            url: this.productTransferUrl,
                            label: 'Click Here to view the records',
                        },
                    ]);
                    
                // Clear draft values after successful save
                this.draftValues = [];
                this.draftValuesList = [];
                this.hideCreatePT();
                this.hideDestinationModalBox();
                refreshApex(this.wiredData);
            })
            .catch(error => {
                // console.error('Error creating Product Transfer records:', error);
                this.showToast('Error', 'An error occurred while creating Product Transfer records.', 'error');
                this.error = error;
            });  
        }
    }


    // Get product item by ProductItemNumber
    getItemByProductNumber(productItemNumber) {
        return this.productTransferData.find(item => item.ProductItemNumber === productItemNumber);
    }

    // Update productItemDetails with the new QuantitySent values
    updateProductItemDetails(updatedItems) {
        updatedItems.forEach(updatedItem => {
            const item = this.getItemByProductNumber(updatedItem.ProductItemNumber);
            if (item) {
                item.QuantitySent = updatedItem.QuantitySent;
            }
        });

        // console.log('Updated Product Item Details after Save:', JSON.stringify(this.productTransferData));
    }

    handleCellChange(event){
        event.preventDefault();
        //console.log('Present Draft Values:', JSON.stringify(event.detail.draftValues));
        if(event.detail.draftValues[0]['QuantitySent'] != 0){
            this.draftValues = this.draftValues.concat(event.detail.draftValues); // Capture the updated draft values from the table
            let draftMapValue = event.detail.draftValues[0]['QuantitySent'];
            let draftMapKey = event.detail.draftValues[0]['ProductItemNumber'];
            // console.log('Present Draft Value ->',draftMapValue);
            // console.log('Present Draft Key ->',draftMapKey);
            this.draftValuesMap[draftMapKey]=draftMapValue;
        }else{
            this.showToast('Error', 'Quantity Sent should be greater than 0', 'error');
        }        
        //console.log('Total Draft Values:', JSON.stringify(this.draftValues));
    }

    handleChange(event)
    {
        event.preventDefault();
        if(event.target.name == 'searchProduct'){
            this.productName = event.target.value;
        }
        else if(event.target.name == 'searchLocation'){
            this.locationName = event.target.value;
        }else if(event.target.name == 'productFamilyCombobox'){
            this.selectedProductFamily = event.detail.value;
			if(!this.allProductFamilyValues.includes(this.selectedProductFamily)){
                this.allProductFamilyValues.push(this.selectedProductFamily);
            }        
            this.modifyProductFamilyOptions();
        }else if(event.target.name == 'locationTypeCombobox'){
            this.selectedLocationType = event.detail.value;
			if(!this.allLocationTypeValues.includes(this.selectedLocationType)){
                this.allLocationTypeValues.push(this.selectedLocationType);
            }        
            this.modifyLocationTypeOptions();
        }else if(event.target.name == 'searchProductItem'){
            this.productItemNumber = event.target.value;
        }
        
    }
	
	handleRemoveProductFamily(event)
    {
      this.selectedProductFamily='';
      const valueRemoved=event.target.name;
      this.allProductFamilyValues.splice(this.allProductFamilyValues.indexOf(valueRemoved),1);
      this.modifyProductFamilyOptions();
    }
  
    modifyProductFamilyOptions()
    {
      this.productFamilyOptions=this.productFamilyOptionsMaster.filter(elem => {
        if(!this.allProductFamilyValues.includes(elem.value)){
            //console.log('Selected Product Family options ----'+JSON.stringify(this.allProductFamilyValues));
            return elem; 
        }
                
      })
    }

    handleRemoveLocationType(event)
    {
      this.selectedLocationType='';
      const valueRemoved=event.target.name;
      this.allLocationTypeValues.splice(this.allLocationTypeValues.indexOf(valueRemoved),1);
      this.modifyLocationTypeOptions();
    }
  
    modifyLocationTypeOptions()
    {
      this.locationTypeOptions=this.locationTypeOptionsMaster.filter(elem => {
        if(!this.allLocationTypeValues.includes(elem.value)){
            //console.log('Selected Location Type options ----'+JSON.stringify(this.allLocationTypeValues));
            return elem; 
        }     
      })
    }

    clearSearch(){
        this.locationName = '';
        this.productName = '';
        this.selectedProductFamily = '';
        this.selectedLocationType = '';
        this.productItemNumber = '';
		this.allLocationTypeValues = [];
        this.allProductFamilyValues = [];
        this.locationTypeOptions = this.locationTypeOptionsMaster;
        this.productFamilyOptions = this.productFamilyOptionsMaster;
    }

    searchProduct(){
        searchProductItems({
            productName:this.productName,
            locationName:this.locationName,
            locationType:this.allLocationTypeValues,
            productFamily:this.allProductFamilyValues,
            productItemNumber: this.productItemNumber
            
        })
        .then(result => {
            let tempRecords = JSON.parse( JSON.stringify( result ) );
            tempRecords = tempRecords.map( row => {
                if(row.Location!=undefined && row.Product2Id != undefined){
                    return { ...row, 
                        LocationName: row.Location.Name, 
                        productLink : '/' + row.Product2Id,
                        locationLink : '/' + row.LocationId,
                        productItemLink : '/' + row.Id,
                        LocationType : row.Location.LocationType,
                        ProductFamily : row.Product2.Family
                    };
                }
                else{
                    return {...row};
                }
            })
            this.data = tempRecords;
            this.error = undefined;
            if(this.data.length == 0){
                this.data = undefined;
                this.showToast('Warning!', 'No records found with the provided filters. Please modify the filter criteria.', 'warning')
            }
        })
        .catch(error => {
            this.error = error;
            this.data = undefined;
            //console.log(JSON.stringify(error));
        })


    }

    @wire(getProductItems)
    wiredProductItems(result){
        if(result.data){
            this.wiredData = result;
            let tempRecords = JSON.parse( JSON.stringify( result.data ) );
            tempRecords = tempRecords.map( row => {
                if(row.Location	!=undefined && row.Product2Id != undefined){
                    return { ...row, 
                        LocationName: row.Location.Name,
                        productLink : '/' + row.Product2Id,
                        locationLink : '/' + row.LocationId,
                        productItemLink : '/' + row.Id,
                        LocationType : row.Location.LocationType,
                        ProductFamily : row.Product2.Family
                    };
                }
                else{
                    return {...row};
                }
            })
            this.data = tempRecords;
            this.error = undefined;
        }
        else if(result.error){
            this.error = result.error;
            this.data = undefined;
            //console.log(JSON.stringify(this.error));
        }
    }

    handleRowSelection(event) {
        event.preventDefault();
        switch (event.detail.config.action) {
            case 'selectAllRows':
                if(event.detail.selectedRows.length > 0){
                    this.isRowsSelected = true;
                    for (let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.selectedLocations.push(event.detail.selectedRows[i].Location.Name);
                        this.selectedLocationIDs.push(event.detail.selectedRows[i].LocationId);
                        this.selectedProductItemIDs.push(event.detail.selectedRows[i].Id);
                    }
                }
                break;
            case 'deselectAllRows':
                this.selectedData = [];
                this.selectedLocations = [];
                this.selectedLocationIDs = [];
                this.selectedProductItemIDs = [];
                this.isRowsSelected = false;
                break;
            case 'rowSelect':
                this.selectedData = [];
                this.selectedProductItemIDs = [];
                this.selectedLocations = [];
                this.selectedLocationIDs = [];
                if(event.detail.selectedRows.length > 0){
                    this.isRowsSelected = true;
                    for (let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.selectedLocations.push(event.detail.selectedRows[i].Location.Name);
                        this.selectedLocationIDs.push(event.detail.selectedRows[i].LocationId);
                        this.selectedProductItemIDs.push(event.detail.selectedRows[i].Id);
                    }
                }
                break;
            case 'rowDeselect':
                //console.log('Row Deselection, the selected rows now are: '+JSON.stringify(event.detail.selectedRows));

                this.selectedData = [];
                this.selectedLocationIDs = [];
                this.selectedLocations = [];
                this.selectedProductItemIDs = [];
                this.isRowsSelected = false;
                if(event.detail.selectedRows.length > 0){
                    this.isRowsSelected = true;
                    for (let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.selectedLocations.push(event.detail.selectedRows[i].Location.Name);
                        this.selectedLocationIDs.push(event.detail.selectedRows[i].LocationId);
                        this.selectedProductItemIDs.push(event.detail.selectedRows[i].Id);
                    }
                }
                break;
            default:
                break;
        }
    }
	
	previousHandler(event){
        event.preventDefault();
        this.hideCreatePT();
        this.showDestinationModalBox();
    }

    //Implementing the address feature for location
    // Fetch product item addresses and display them on the map
    handleShowAddress(event) {    
        event.preventDefault();
        //Check the productItemIds and length must be greather than zero
        if (this.selectedProductItemIDs && this.selectedProductItemIDs.length > 0) {
            getProductItemLocations({ productItemIds: this.selectedProductItemIDs })
                .then(result => {
                    if (result && result.length > 0) {
                        this.mapMarkers = result.map(currentItem => {
                            if (currentItem.Location && currentItem.Location.VisitorAddress) {
                                return {
                                    //return the latitude and longitude of the location address
                                    location: {
                                        // Latitude: currentItem.Location.VisitorAddress.Latitude,
                                        // Longitude: currentItem.Location.VisitorAddress.Longitude,
                                        
                                        Street: currentItem.Location.VisitorAddress.Street,
                                        City: currentItem.Location.VisitorAddress.City,
                                        State: currentItem.Location.VisitorAddress.State,
                                        Country: currentItem.Location.VisitorAddress.Country,
                                        PostalCode: currentItem.Location.VisitorAddress.PostalCode,
                                        ProductName: currentItem.ProductName,
                                        QuantityOnHand: currentItem.QuantityOnHand
                                    },
                                    title: currentItem.Location.Name,
                                    description: `Product : <b>${currentItem.ProductName}</b><br/>` +  // Product Name on a new line
                                        `Quantity On Hand : <b>${currentItem.QuantityOnHand}</b><br/>` +  // Hands-On Quantity on a new line
                                        `${currentItem.Location.VisitorAddress.Street}, ` +
                                        `${currentItem.Location.VisitorAddress.City}, ` +
                                        `${currentItem.Location.VisitorAddress.State}, ` +
                                        `${currentItem.Location.VisitorAddress.Country}, ` +
                                        `${currentItem.Location.VisitorAddress.PostalCode}`
                                };
                            }
                                //     //Title text for the location, displayed in the location list and in the info window when you click a marke
                                //     title: currentItem.Location.Name,
                                    
                                    
                                //     //Text describing the location, displayed in the info window when you click a marker or location title
                                //     description: `${currentItem.Location.VisitorAddress.Street}, ${currentItem.Location.VisitorAddress.City}, ${currentItem.Location.VisitorAddress.State}, ${currentItem.Location.VisitorAddress.Country},${currentItem.Location.VisitorAddress.PostalCode},
                                //     ("Product": ${currentItem.ProductName}<br/> + "QuantityOnHand" :${currentItem.QuantityOnHand}")`
                                    
                                // };
                            
                        })

                        //If marker length have one more than one open the map
                        if (this.mapMarkers.length > 0) {
                            if (this.mapButton === 'Show Map') {
                                this.isMapVisible = true; // Show the map once markers are ready
                                this.mapButton = 'Hide Map'
                            } else if (this.mapButton === 'Hide Map') {
                                this.isMapVisible = false;
                                this.mapButton = 'Show Map'
                            }
                        } else {
                            this.showToast('Error', 'No valid locations found for selected products.', 'error');
                        }
                    } else {
                        this.showToast('Error', 'No locations found for the selected product items.', 'error');
                    }
                })
                .catch(error => {
                    this.showToast('Error', 'Failed to retrieve product locations.', 'error');
                    // console.error('Error fetching locations:', error);
                    this.error = error;
                });
        } else {
            this.showToast('Error', 'Please select at least one product to show the address.', 'error');
        }
    }

    
    handleLocationRecordPickerChange(event){
        event.preventDefault();
        //console.log('Selected Destination Lcoation ID -> '+event.detail.recordId);
        if(event.detail.recordId != undefined){
            let locationRecordPicker = this.refs.locationRecordPicker;
            if(this.selectedLocationIDs.includes(event.detail.recordId)){
                //window.alert('Destination Location is Same as Source Location. Please change the Destination Location.');
                locationRecordPicker.setCustomValidity('Destination Location is Same as Source Location. Please change the Destination Location.');
            }else {
                //console.log('Destination Location is Valid!');
                locationRecordPicker.setCustomValidity('');
                this.destinationLocation = event.detail.recordId;    
            }
            locationRecordPicker.reportValidity();
        }
        
    }

    handleSelectDestination(event){
        event.preventDefault();
        this.showDestinationModalBox();
        this.selectedLocations = [...new Set(this.selectedLocations)];
        this.selectedLocationIDs = [...new Set(this.selectedLocationIDs)];
        //console.log('Currently selected Locations: '+JSON.stringify(this.selectedLocations));
        //console.log('Currently selected Location IDs: '+JSON.stringify(this.selectedLocationIDs));

    }

    submitDestinationDetails(event){
        event.preventDefault();
        
        if(this.destinationLocation != undefined){
            getDestinationLocationName({
                recordId : this.destinationLocation
            })
            .then(result => {
                this.destinationLocationName = result;
                //console.log('Destination Location Name -> '+this.destinationLocationName)
                var tempRecords = [...this.selectedData];
                tempRecords = tempRecords.map( row => {
                    return { ...row, 
                        DestinationLocationName : this.destinationLocationName,
                        QuantitySent: '',
                    };
                })
                this.productTransferData = tempRecords;
                this.showCreatePT();
                this.hideDestinationModalBox();
    
            })
            .catch( error => {
                this.error= error;
                //console.log(JSON.stringify(error));
            })
        }

    }

    // Show toast notifications
    showToast(title, message, variant,messageData) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            messageData : messageData
        });
        this.dispatchEvent(event);
    }
}