import { LightningElement,wire,track,api } from 'lwc';
import { refreshApex } from "@salesforce/apex";
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getSerializedProducts from '@salesforce/apex/SerializedProductTransferController.getSerializedProducts'
import getDestinationLocationName from '@salesforce/apex/SerializedProductTransferController.getDestinationLocationName';
import createProductTransferRecords from '@salesforce/apex/SerializedProductTransferController.createProductTransferRecords';
import searchSerializedProducts from '@salesforce/apex/SerializedProductTransferController.searchSerializedProducts';
import getProductItemLocations from '@salesforce/apex/SerializedProductTransferController.getProductItemLocations';
import { getObjectInfo,getPicklistValues } from "lightning/uiObjectInfoApi";
import PRODUCT_OBJECT from "@salesforce/schema/Product2";
import LOCATION_OBJECT from "@salesforce/schema/Location";
import PRODUCT_FAMILY from "@salesforce/schema/Product2.Family";
import LOCATION_TYPE from "@salesforce/schema/Location.LocationType";

export default class SerializedProductTransfers extends NavigationMixin(LightningElement) {

    serializedProductsMap = {}; // Map to store Serialized Product Id as key and its associated Product Item as value
    productItemCountMap = {}; // Map to store Selected Product Item Id as key and count of selected product items as value
    productItemProductMap = {}; // Map to store Product Item Id as key and its associated Product2Id as value
    isRowsSelected = false;
    serialNumber='';
    @track sortBy;
    @track sortDirection;
    productName='';
    locationName='';
    data;
    error;
    selectedData = [];
    selectedLocations = [];
    selectedLocationIDs = [];
    selectedProductItemIDs = [];
    selectedSerializedProducts = [];
    selectedProduct2Ids = [];
    destinationLocation;
    destinationLocationName;
    @track isShowModal = false;
    @track isShowCreatePT = false;
    quantityToBeSent = {};
    wrapperData = [];
    wiredData =[];
    locationTypeOptions;
    productFamilyOptions;
    selectedProductFamily='';
    selectedLocationType='';
    productItemNumber ='';
    productRecordTypeId;
    locationRecordTypeId;
    productTransferData=[];
    @track allProductFamilyValues=[];
    @api productFamilyOptionsMaster;
    @track allLocationTypeValues=[];
    @api locationTypeOptionsMaster;
    productTransferUrl;
    selectedDataSize;
    @track mapMarkers=[];
    @track isMapVisible =false;
    @track mapButton = 'Show Map';

    @api
    get serializedProductColumns() {
        return [
            {
                label: 'Serialized Product',
                fieldName: 'serializedProductLink',
                type: 'url',
                typeAttributes: { label: {fieldName : 'Name' }, target: '_blank'},
                sortable: "true"
            },
            {
                label: 'Product Item',
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
                label: 'Serial Number',
                fieldName: 'SerialNumber',
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
            {
                label: 'Name',
                fieldName: 'Name',
                wrapText: true
            },
            {
                label: 'Serial Number',
                fieldName: 'SerialNumber',
                wrapText: true
            },
            {
                label: 'Status',
                fieldName: 'Status',
                wrapText: true
            },
            {
                label: 'Product',
                fieldName: 'ProductName',
                wrapText: true
            },
            {
                label: 'Product Item',
                fieldName: 'ProductItemNumber',
                wrapText: true
            },
            {
                label: 'Source Location',
                fieldName: 'SourceLocation',
                wrapText: true
            },
            {
                label: 'Destination Location',
                fieldName: 'DestinationLocation',
                wrapText: true
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

    createProductTransfers(event){
        event.preventDefault();
        this.hideDestinationModalBox();
        //console.log('Quantity Sent -> '+JSON.stringify(this.quantityToBeSent));
        for(let i = 0; i < this.selectedProductItemIDs.length; i++) {
            let wrapperInfo = {};
            wrapperInfo['product2Id'] = this.productItemProductMap[this.selectedProductItemIDs[i]];
            wrapperInfo['destinationLocationId'] = this.destinationLocation;
            wrapperInfo['sourceProductItemId'] = this.selectedProductItemIDs[i];
            wrapperInfo['quantitySent']= this.productItemCountMap[this.selectedProductItemIDs[i]];
            this.wrapperData.push(wrapperInfo);
           
        }

        this.selectedDataSize = this.wrapperData.length;
        //console.log('No. of Product Transfer to be created -> '+this.selectedDataSize);

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
        this[NavigationMixin.GenerateUrl](productTransferListView)
            .then(url => {
                this.productTransferUrl = url;
                // console.log('URL ----'+this.productTransferUrl);
            }
        );
        //console.log('Wrapper Data -> '+JSON.stringify(this.wrapperData));
        createProductTransferRecords({
            wrapperData : this.wrapperData,
            serializedProductMap : this.serializedProductsMap // This map is to send Serialized Product Id as key and associated Product Item ID as Value
        })
        .then(result => {
            this.showToast('Success', '{0} Product Transfer Records created successfully! {1}',
                'success',[
                this.selectedDataSize.toString(),
                    {
                        url: this.productTransferUrl,
                        label: 'Click Here to view the records',
                    },
                ]);
            this.hideCreatePT();
            this.hideDestinationModalBox();
            refreshApex(this.wiredData);
        })
        .catch(error => {
            this.error = error;
            this.showToast('Error', 'An error occurred while creating Product Transfer records.', 'error');
            //console.log(JSON.stringify(error));
        })
    }

    previousHandler(event){
        event.preventDefault();
        this.hideCreatePT();
        this.showDestinationModalBox();
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
        }else if(event.target.name == 'searchSerialNumber'){
            this.serialNumber = event.target.value;
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
            // console.log('Selected Product Family options ----'+JSON.stringify(this.allProductFamilyValues));
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
            // console.log('Selected Location Type options ----'+JSON.stringify(this.allLocationTypeValues));
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
        this.serialNumber = '';
        this.allLocationTypeValues = [];
        this.allProductFamilyValues = [];
        this.locationTypeOptions = this.locationTypeOptionsMaster;
        this.productFamilyOptions = this.productFamilyOptionsMaster;
    }

    searchProduct(){
        searchSerializedProducts({
            productName:this.productName,
            locationName:this.locationName,
            locationType:this.allLocationTypeValues,
            productFamily:this.allProductFamilyValues,
            productItemNumber: this.productItemNumber,
            serialNumber : this.serialNumber
        })
        .then(result => {
            let tempRecords = JSON.parse( JSON.stringify( result ) );
            tempRecords = tempRecords.map( row => {
                if(row.ProductItem.LocationId != undefined && row.Product2Id != undefined){
                    return { ...row, 
                        LocationName: row.ProductItem.Location.Name, 
                        productLink : '/' + row.Product2Id,
                        locationLink : '/' + row.ProductItem.LocationId,
                        serializedProductLink : '/' + row.Id,
                        LocationType : row.ProductItem.Location.LocationType,
                        ProductFamily : row.Product2.Family,
                        ProductName : row.Product2.Name,
                        productItemLink : '/' + row.ProductItemId,
                        ProductItemNumber : row.ProductItem.ProductItemNumber,
                        QuantityOnHand : row.ProductItem.QuantityOnHand
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
                this.showToast('Warning!', 'No records found with the provided filters. Please modify the filter criteria.', 'warning');
            }
        })
        .catch(error => {
            this.error = error;
            this.data = undefined;
            //console.log(JSON.stringify(error));
        })


    }

    @wire(getSerializedProducts)
    wiredSerializedProducts(result){
        this.wiredData = result;
        if(result.data){
            let tempRecords = JSON.parse( JSON.stringify( result.data ) );
            tempRecords = tempRecords.map( row => {
                if(row.ProductItem.LocationId != undefined && row.Product2Id != undefined){
                    return { ...row, 
                        LocationName: row.ProductItem.Location.Name, 
                        productLink : '/' + row.Product2Id,
                        locationLink : '/' + row.ProductItem.LocationId,
                        serializedProductLink : '/' + row.Id,
                        LocationType : row.ProductItem.Location.LocationType,
                        ProductFamily : row.Product2.Family,
                        ProductName : row.Product2.Name,
                        productItemLink : '/' + row.ProductItemId,
                        ProductItemNumber : row.ProductItem.ProductItemNumber,
                        QuantityOnHand : row.ProductItem.QuantityOnHand
                    };
                }
                else{
                    return {...row};
                }
            })
            this.data = tempRecords;
            // console.table(this.data);
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
                    this.productItemProductMap = {};
                    this.serializedProductsMap = {};
                    for (let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.selectedLocations.push(event.detail.selectedRows[i].ProductItem.Location.Name);
                        this.selectedLocationIDs.push(event.detail.selectedRows[i].ProductItem.LocationId);
                        this.selectedProductItemIDs.push(event.detail.selectedRows[i].ProductItem.Id);
                        this.selectedSerializedProducts.push(event.detail.selectedRows[i].Id);
                        this.productItemProductMap[event.detail.selectedRows[i].ProductItem.Id] = event.detail.selectedRows[i].Product2Id;
                        this.serializedProductsMap[event.detail.selectedRows[i].Id] = event.detail.selectedRows[i].ProductItem.Id;
                    }
                }
                break;
            case 'deselectAllRows':
                this.selectedData = [];
                this.selectedLocations = [];
                this.selectedLocationIDs = [];
                this.selectedProductItemIDs = [];
                this.selectedSerializedProducts = [];
                this.isRowsSelected = false;
                this.productItemProductMap = {};
                this.serializedProductsMap = {};
                break;
            case 'rowSelect':
                this.productItemProductMap = {};
                this.serializedProductsMap = {};
                this.selectedData = [];
                this.selectedLocationIDs = [];
                this.selectedLocations = [];
                this.selectedProductItemIDs = [];
                this.selectedSerializedProducts = [];
                if(event.detail.selectedRows.length > 0){
                    this.isRowsSelected = true;
                    for (let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.selectedLocations.push(event.detail.selectedRows[i].ProductItem.Location.Name);
                        this.selectedLocationIDs.push(event.detail.selectedRows[i].ProductItem.LocationId);
                        this.selectedProductItemIDs.push(event.detail.selectedRows[i].ProductItem.Id);
                        this.selectedSerializedProducts.push(event.detail.selectedRows[i].Id);
                        this.productItemProductMap[event.detail.selectedRows[i].ProductItem.Id] = event.detail.selectedRows[i].Product2Id;
                        this.serializedProductsMap[event.detail.selectedRows[i].Id] = event.detail.selectedRows[i].ProductItem.Id;
                        
                    }
                    // console.log('Row selection, the selected rows now are: '+JSON.stringify(this.selectedProductItemIDs));
                }
                break;
            case 'rowDeselect':
                //console.log('Row Deselection, the selected rows now are: '+JSON.stringify(event.detail.selectedRows));
                this.productItemProductMap = {};
                this.serializedProductsMap = {};
                this.selectedData = [];
                this.selectedLocationIDs = [];
                this.selectedLocations = [];
                this.selectedProductItemIDs = [];
                this.selectedSerializedProducts = [];
                this.isRowsSelected = false;
                if(event.detail.selectedRows.length > 0){
                    this.isRowsSelected = true;
                    for (let i = 0; i < event.detail.selectedRows.length; i++) {
                        this.selectedData.push(event.detail.selectedRows[i]);
                        this.selectedLocations.push(event.detail.selectedRows[i].ProductItem.Location.Name);
                        this.selectedLocationIDs.push(event.detail.selectedRows[i].ProductItem.LocationId);
                        this.selectedProductItemIDs.push(event.detail.selectedRows[i].ProductItem.Id);
                        this.selectedSerializedProducts.push(event.detail.selectedRows[i].Id);
                        this.productItemProductMap[event.detail.selectedRows[i].ProductItem.Id] = event.detail.selectedRows[i].Product2Id;
                        this.serializedProductsMap[event.detail.selectedRows[i].Id] = event.detail.selectedRows[i].ProductItem.Id;
                    }
                    // console.log('Row de-selection, the selected rows now are: '+JSON.stringify(this.selectedProductItemIDs));
                }    
                break;
            default:
                break;
        }
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
                        this.showToast('Error', 'No locations found for the selected serialized products.', 'error');
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
        this.productItemCountMap = {};
        this.selectedProductItemIDs.forEach((item) => {
            if(this.productItemCountMap[item] != undefined){
                this.productItemCountMap[item] = this.productItemCountMap[item] + 1;
            }else{
                this.productItemCountMap[item] = 1;
            }
        })
       
        this.selectedLocations = [...new Set(this.selectedLocations)];
        this.selectedLocationIDs = [...new Set(this.selectedLocationIDs)];
        this.selectedProductItemIDs = [...new Set(this.selectedProductItemIDs)];
        this.selectedSerializedProducts = [...new Set(this.selectedSerializedProducts)];
        // console.log('Currently selected Locations: '+JSON.stringify(this.selectedLocations));
        // console.log('Currently selected Location IDs: '+JSON.stringify(this.selectedLocationIDs));
        // console.log('Currently selected Product Item IDs: '+JSON.stringify(this.selectedProductItemIDs));
        // console.log('Currently selected Serialized Products: '+JSON.stringify(this.selectedSerializedProducts));
        // console.log('Product ITem Map:'+JSON.stringify(this.productItemCountMap));
        // console.log('Product Map:'+JSON.stringify(this.productItemProductMap));
        // console.log('Serialized Product Map:' +JSON.stringify(this.serializedProductsMap) )

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
                            DestinationLocation : this.destinationLocationName,
                            ProductItemNumber : row.ProductItem.ProductItemNumber,
                            SourceLocation : row.ProductItem.Location.Name
                        };
                })
                this.productTransferData = tempRecords;
                this.showCreatePT();
                this.hideDestinationModalBox();
    
            })
            .catch( error => {
                this.error= error;
                // console.log(JSON.stringify(error));
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