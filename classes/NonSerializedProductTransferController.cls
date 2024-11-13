public class NonSerializedProductTransferController {
	@AuraEnabled(cacheable=true)
    public static List<ProductItem> searchProductItems(String productName, String locationName,List<String> locationType, List<String> productFamily,String productItemNumber){ 
        try{
            List<ProductItem> productItemsList = new List<ProductItem>();
            if(!String.isBlank(productItemNumber)){
                String itemNumberKey='%'+productItemNumber+'%';
                productItemsList = [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,QuantityOnHand,
                                    Location.LocationType,Product2.Family 
                                    FROM ProductItem where product2.IsSerialized = false AND QuantityOnHand>0 AND ProductItemNumber like :itemNumberKey 
                                    WITH USER_MODE LIMIT 20];
            }
            else if(!String.isBlank(productName) || !String.isBlank(locationName) || locationType.size()>0 || productFamily.size()>0){
                if(locationType.size()==0 && productFamily.size()==0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    productItemsList = [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,
                                        QuantityOnHand,Location.LocationType,Product2.Family
                                        FROM ProductItem
                                        where product2.IsSerialized = false AND
                                        QuantityOnHand>0 AND
                                        ProductName like :productNameKey AND 
                                        Location.Name like :locationNameKey WITH USER_MODE
                                        order by createddate desc LIMIT 20];
                    
                }else if(locationType.size()==0 && productFamily.size()>0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    productItemsList = [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,
                                        QuantityOnHand,Location.LocationType,Product2.Family
                                        FROM ProductItem
                                        where product2.IsSerialized = false AND
                                        QuantityOnHand>0 AND
                                        ProductName like :productNameKey AND 
                                        Location.Name like :locationNameKey AND
                                        Product2.Family IN :productFamily WITH USER_MODE
                                        order by createddate desc LIMIT 20];
                }else if(locationType.size()>0 && productFamily.size()==0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    productItemsList = [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,
                                        QuantityOnHand,Location.LocationType,Product2.Family
                                        FROM ProductItem
                                        where product2.IsSerialized = false AND
                                        QuantityOnHand>0 AND
                                        ProductName like :productNameKey AND 
                                        Location.Name like :locationNameKey AND
                                        Location.LocationType IN :locationType WITH USER_MODE
                                        order by createddate desc LIMIT 20];
                }else if(locationType.size()>0 && productFamily.size()>0){
                    String productNameKey = '%' + productName + '%';
                    String locationNameKey = '%' + locationName + '%';
                    productItemsList = [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,
                                        QuantityOnHand,Location.LocationType,Product2.Family
                                        FROM ProductItem
                                        where product2.IsSerialized = false AND
                                        ProductName like :productNameKey AND 
                                        Location.Name like :locationNameKey AND
                                        Location.LocationType IN :locationType AND
                                        QuantityOnHand>0 AND
                                        Product2.Family IN :productFamily WITH USER_MODE
                                        order by createddate desc LIMIT 20];
                }
                
            }
            else{
                productItemsList = [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,QuantityOnHand,
                                    Location.LocationType,Product2.Family FROM ProductItem where QuantityOnHand>0 
                                    AND product2.IsSerialized = false WITH USER_MODE
                                    order by createddate desc LIMIT 20];
            }
            return productItemsList;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<ProductItem> getProductItems(){
        try {
            return [select id,ProductItemNumber,Product2.Id,ProductName,Location.Name,QuantityOnHand,
                    Location.LocationType,Product2.Family FROM ProductItem where QuantityOnHand>0 
                    AND product2.IsSerialized = false WITH USER_MODE
                    order by createddate desc LIMIT 20];
            
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
    public static void createProductTransferRecords(List<ProductTransferWrapper> wrapperData)
    {
        try{
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
                        // System.debug('Successfully inserted Product Transfer record. Product Transfer ID: ' + sr.getId());
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
    
    //This method for show Location address in Map
    @AuraEnabled(cacheable=true)
	public static List<ProductItem> getProductItemLocations (List<Id> productItemIds){
        try{
            List<ProductItem> productLocations = [select Id,ProductName,QuantityOnHand,Location.Name,Location.VisitorAddressId,
                                                  Location.VisitorAddress.Address,Location.VisitorAddress.Country,
                                                  Location.VisitorAddress.State,Location.VisitorAddress.Street, 
                                                  Location.VisitorAddress.PostalCode,Location.VisitorAddress.City,
                                                  Location.VisitorAddress.Longitude,Location.VisitorAddress.Latitude 
                                                  from ProductItem where Id = : productItemIds AND 
                                                  Location.VisitorAddressId != '' WITH USER_MODE LIMIT 20];
            // System.debug('Fetched Locations Records:'+ productLocations);
            return productLocations;	 
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
	}

}