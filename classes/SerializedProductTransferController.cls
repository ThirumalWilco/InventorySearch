public with sharing class SerializedProductTransferController {
	@AuraEnabled(cacheable=true)
    public static List<SerializedProduct> getSerializedProducts(){
        try {
            return [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,ProductItem.ProductItemNumber,
                    ProductItem.LocationId,ProductItem.Location.Name,ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                    FROM SerializedProduct where Status = 'Available' WITH USER_MODE
                    order by createddate desc LIMIT 20];
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
	@AuraEnabled(cacheable=true)
    public static List<SerializedProduct> searchSerializedProducts(String productName, String locationName,List<String> locationType, List<String> productFamily,String productItemNumber,String serialNumber){
        try{
            List<SerializedProduct> serializedProductsList = new List<SerializedProduct>();
            if(!String.isBlank(productItemNumber)){
                String productItemNumberKey='%'+productItemNumber+'%';
                serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                          ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                          FROM SerializedProduct
                                          where Status = 'Available' AND ProductItem.ProductItemNumber like :productItemNumberKey WITH USER_MODE 
                                          order by createddate desc LIMIT 20];
            }
            else if(!String.isBlank(serialNumber)){
                String serialNumberKey='%'+serialNumber+'%';
                serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                          ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                          FROM SerializedProduct where Status = 'Available' and SerialNumber like :serialNumberKey WITH USER_MODE
                                          order by createddate desc LIMIT 20];
            }
            else if(!String.isBlank(productName) || !String.isBlank(locationName) || locationType.size()>0 || productFamily.size()>0){
                if(locationType.size()==0 && productFamily.size()==0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                              ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                              FROM SerializedProduct
                                              where Status = 'Available' AND Product2.Name like :productNameKey AND 
                                              ProductItem.Location.Name like :locationNameKey WITH USER_MODE
                                              order by createddate desc LIMIT 20];
                }else if(locationType.size()==0 && productFamily.size()>0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                              ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,
                                              ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                              FROM SerializedProduct
                                              where Status = 'Available' AND Product2.Name like :productNameKey AND 
                                              ProductItem.Location.Name like :locationNameKey AND Product2.Family IN :productFamily WITH USER_MODE
                                              order by createddate desc LIMIT 20];
                }
                else if(locationType.size()>0 && productFamily.size()==0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                              ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,
                                              ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                              FROM SerializedProduct
                                              where Status = 'Available' AND Product2.Name like :productNameKey AND 
                                              ProductItem.Location.Name like :locationNameKey AND ProductItem.Location.LocationType IN :locationType WITH USER_MODE
                                              order by createddate desc LIMIT 20];
                }else if(locationType.size()>0 && productFamily.size()>0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                              ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,
                                              ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                              FROM SerializedProduct
                                              where Status = 'Available' AND Product2.Name like :productNameKey AND 
                                              ProductItem.Location.Name like :locationNameKey AND 
                                              ProductItem.Location.LocationType IN :locationType AND Product2.Family IN :productFamily WITH USER_MODE
                                              order by createddate desc LIMIT 20];
                }
                
            }
            else{
                serializedProductsList = [SELECT Id,name,SerialNumber,status,Product2Id,Product2.Name,Product2.Family,ProductItemId,
                                          ProductItem.ProductItemNumber,ProductItem.LocationId,ProductItem.Location.Name,ProductItem.QuantityOnHand,ProductItem.Location.LocationType 
                                          FROM SerializedProduct where Status = 'Available' WITH USER_MODE order by createddate desc LIMIT 20];
            }
            return serializedProductsList;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static String getDestinationLocationName(String recordId){
        try {
            return [select id,Name FROM Location where id=:recordId WITH USER_MODE].Name;
            
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void createProductTransferRecords(List<ProductTransferWrapper> wrapperData,Map<Id,Id> serializedProductMap)
    {
        try{
            List<Id> productTransferIds = new List<Id>();
            List<ProductTransfer> ptToInsert = new List<ProductTransfer>();
            for(ProductTransferWrapper wrapper:wrapperData){
                ProductTransfer pt = new ProductTransfer();
                pt.Product2Id = wrapper.product2Id;
                pt.SourceProductItemId = wrapper.sourceProductItemId;
                pt.DestinationLocationId = wrapper.destinationLocationId;
                pt.QuantitySent = (Decimal) wrapper.quantitySent;
                ptToInsert.add(pt);
            }
            if(!ptToInsert.isEmpty()){
                Database.SaveResult[] saveResults = Database.insert(ptToInsert, false,AccessLevel.USER_MODE);
                for (Database.SaveResult sr : saveResults) {
                    if (sr.isSuccess()) {
                        // Operation was successful, so get the ID of the record that was processed
                        // System.debug('Successfully inserted Product Transfer. Product Transfer ID: ' + sr.getId());
                        productTransferIds.add(sr.getId());
                    }
                    else {
                        // Operation failed, so get all errors                
                        for(Database.Error err : sr.getErrors()) {
                            // System.debug('The following error has occurred.');                    
                            // System.debug(err.getStatusCode() + ': ' + err.getMessage());
                            // System.debug('Fields that affected this error: ' + err.getFields());
                        }
                    }
                }
                if(!productTransferIds.isEmpty()){
                    Boolean result = false;
                    Map<Id,Id> serializedProductTransferMap = new Map<Id,Id>(); // Map to store Serialized Product Id as key and Product Transfer ID as value
                    Map<Id,Id> productItemProductTransferMap = new Map<Id,Id>(); // Map to store Product Item Id as key and Product Transfer ID as value
                    List<ProductTransferStateWrapper> wrapperList = new List<ProductTransferStateWrapper>();
                    ProductTransfer[] productTransfersCreated = [select id,SourceProductItemId from ProductTransfer where id in:productTransferIds WITH USER_MODE];
                    for(ProductTransfer pt:productTransfersCreated){
                        productItemProductTransferMap.put(pt.SourceProductItemId,pt.id);
                    }
                    if(productTransfersCreated.size()>0){
                        for(Id serializedProductId:serializedProductMap.keySet()){
                            if(productItemProductTransferMap.containsKey(serializedProductMap.get(serializedProductId))){
                                serializedProductTransferMap.put(serializedProductId,productItemProductTransferMap.get(serializedProductMap.get(serializedProductId)));
                            }
                        }
                        for(Id ptId:serializedProductTransferMap.keySet()){
                            ProductTransferStateWrapper wrapper = new ProductTransferStateWrapper();
                            wrapper.SerializedProductId = ptId;
                            wrapper.ProductTransferId = serializedProductTransferMap.get(ptId);
                            wrapperList.add(wrapper);
                        }
                    }
                    if(!wrapperList.isEmpty()){
                        result = createProductTransferStateRecords(wrapperList);
                    }
                    if(result){
                        updateProductTransferRecords(productTransfersCreated);
                    }  
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static Boolean createProductTransferStateRecords(List<ProductTransferStateWrapper> wrapperData)
    {
        try{
            List<ProductTransferState> ptsToInsert = new List<ProductTransferState>();
            for(ProductTransferStateWrapper wrapper:wrapperData){
                ProductTransferState pts = new ProductTransferState();
                pts.SerializedProductId = wrapper.serializedProductId;
                pts.Action = 'Send';
                pts.TransferState = 'Sent';
                pts.ProductTransferId = wrapper.productTransferId;
                ptsToInsert.add(pts);
            }
            if(!ptsToInsert.isEmpty()){
                Database.SaveResult[] saveResults = Database.insert(ptsToInsert,false,AccessLevel.USER_MODE);
                for(Database.SaveResult sr : saveResults) {
                    if (sr.isSuccess()) {
                        // Operation was successful, so get the ID of the record that was processed
                        // System.debug('Product Transfer State Records Inserted Successfully. Product Transfer State ID: ' + sr.getId());
                    }
                    else {
                        // Operation failed, so get all errors                
                        for(Database.Error err : sr.getErrors()) {
                            // System.debug('The following error has occurred.');                    
                            // System.debug(err.getStatusCode() + ': ' + err.getMessage());
                            // System.debug('Fields that affected this error: ' + err.getFields());
                        }
                    }
                }
                if(saveResults.size()>0){
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static void updateProductTransferRecords(List<ProductTransfer> ptRecords)
    {
        try{
            List<ProductTransfer> ptsToUpdate = new List<ProductTransfer>();
            for(ProductTransfer pt:ptRecords){
                pt.isSent = true;
                ptsToUpdate.add(pt);
            }
            if(!ptsToUpdate.isEmpty()){
                Database.SaveResult[] saveResults = Database.update(ptsToUpdate,false,AccessLevel.USER_MODE);
                for (Database.SaveResult sr : saveResults) {
                    if (sr.isSuccess()) {
                        // Operation was successful, so get the ID of the record that was processed
                        // System.debug('Successfully updated Product Transfer. Product Transfer ID: ' + sr.getId());
                    }
                    else {
                        // Operation failed, so get all errors                
                        for(Database.Error err : sr.getErrors()) {
                            // System.debug('The following error has occurred.');                    
                            // System.debug(err.getStatusCode() + ': ' + err.getMessage());
                            // System.debug('Fields that affected this error: ' + err.getFields());
                        }
                    }
                }
            }
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
 
    public class ProductTransferWrapper{
        @AuraEnabled 
        public String product2Id {get;set;}
        @AuraEnabled 
        public String sourceProductItemId {get;set;}
        @AuraEnabled 
        public String destinationLocationId {get;set;}
        @AuraEnabled 
        public Integer quantitySent {get;set;}
    }
    
    public class ProductTransferStateWrapper{
        @AuraEnabled 
        public String serializedProductId {get;set;}
        @AuraEnabled 
        public String productTransferId {get;set;}
    }
    
    //This method for show Location address in Map
    @AuraEnabled(cacheable=true)
	public static List<ProductItem> getProductItemLocations (List<Id> productItemIds){
        try{
            List<ProductItem> productLocations = [select Id,ProductName,QuantityOnHand,Location.Name,Location.VisitorAddressId,
                                                  Location.VisitorAddress.Address,Location.VisitorAddress.Country,
                                                  Location.VisitorAddress.State,Location.VisitorAddress.Street, 
                                                  Location.VisitorAddress.PostalCode,Location.VisitorAddress.City,
                                                  Location.VisitorAddress.Longitude,Location.VisitorAddress.Latitude 
                                                  from ProductItem where Id = : productItemIds AND Location.VisitorAddressId != ''
                                                  WITH USER_MODE LIMIT 20];
            // System.debug('Fetched Locations Records:'+ productLocations);
            return productLocations;	
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
	}
}