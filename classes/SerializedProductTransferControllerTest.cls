@isTest
public class SerializedProductTransferControllerTest {
    @testSetup
    static void setup() {
        // Create sample Product records
        Product2 prod1 = new Product2(Name = 'Test Product1', Family = 'Test Family1',IsSerialized = true,IsActive = true);
        Product2 prod2 = new Product2(Name = 'Test Product2', Family = 'Test Family2',IsSerialized = true,IsActive = true);
        insert new List<Product2>{prod1,prod2};
            
            //Create test Data for Address
            Schema.Address ar1 = new Schema.Address (City = 'Test City1',Country = 'Test Country1', Latitude = 37.7749, Longitude = -122.4194,PostalCode = '94103', State = 'CA1',Street = 'Test Street1' );
        Schema.Address ar2 = new Schema.Address (City = 'Test City2',Country = 'Test Country2', Latitude = 37.7749, Longitude = -122.4194,PostalCode = '94102', State = 'CA2',Street = 'Test Street2' );
        
        
        // Create test data for Locations
        Schema.Location loc1 = new Schema.Location(Name = 'Test Location1', LocationType = 'Inventory',IsInventoryLocation = true,VisitorAddressId = ar1.Id);
        Schema.Location loc2 = new Schema.Location(Name = 'Test Location2', LocationType = 'Van',IsInventoryLocation = true,IsMobile = true,VisitorAddressId = ar2.Id);
        insert new List<Schema.Location>{loc1,loc2};
            
            // Create test data for ProductItem
            ProductItem prodItem1 = new ProductItem(Product2Id = prod1.Id, LocationId=loc1.Id,QuantityOnHand = 0);
        ProductItem prodItem2 = new ProductItem(Product2Id = prod2.Id, LocationId=loc2.Id,QuantityOnHand = 0);
        insert new List<ProductItem>{prodItem1,prodItem2};
            
            // Create test data for SerializedProduct
            SerializedProduct serProd1 = new SerializedProduct(SerialNumber = 'SP-100058',Status = 'Available',Product2Id = prod1.Id,ProductItemId = prodItem1.Id);
        SerializedProduct serProd2 = new SerializedProduct(SerialNumber = 'SP-100059',Status = 'Available',Product2Id = prod2.Id,ProductItemId = prodItem2.Id);
        insert new List<SerializedProduct>{serProd1,serProd2};
            
            }
    
    @isTest
    static void testGetSerializedProducts() {
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.getSerializedProducts();
        Test.StopTest();
        System.assertNotEquals(0, result.size(), 'Expected non-zero results');
        System.assertEquals('Available', result[0].Status, 'Expected status to be Available');
        System.assertEquals(2, result.size(), 'There are should to be Test Serialized Product');
        
    }
    @isTest
    static void testSearchSerializedProducts(){
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts('Test Product1',null, new List<String>(),new List<String>(),null,null);
        Test.stopTest();
    }
    
    @isTest
    static void testSearchSerializedProductsProductItemNumber(){
        ProductItem pi = [SELECT Id,ProductItemNumber FROM ProductItem LIMIT 1];
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts(null,null,null,null,pi.ProductItemNumber,null);
        Test.stopTest();
        System.assertEquals(1, result.size(),'There should be one serialized product matching to Test product1');
    }
    
    @isTest
    static void testSearchSerializedProductsSerialNumber(){
        SerializedProduct sp = [SELECT Id,SerialNumber FROM SerializedProduct LIMIT 1];
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts(null,null,null,null,null,sp.SerialNumber);
        Test.stopTest();
        System.assertEquals(1, result.size(),'There should be one serialized product matching to Test product1');
    }
    
    @isTest
    static void testSearchSerializedProductsWithNoFilters(){
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts(null,null,new List<String>(),new List<String>(),null,null);
        Test.stopTest();
        System.assertEquals(2, result.size(),'There should be one serialized product matching to Test product1');
    }
    
    @isTest
    static void testSearchSerializedProductsWithLocationType(){
        Schema.Location loc =[SELECT Id,Name,LocationType FROM Location WHERE LocationType ='Van' LIMIT 1];
        List<String> locationTypeList = new List<String>();
        locationTypeList.add(loc.locationType);
        
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts(null,null,locationTypeList,new List<String>(),null,null);
        Test.stopTest();
    }
    
    @isTest
    static void testSearchSerializedProductsWithProductFamily(){
        Product2 prod = [SELECT Id,Name,Family From Product2 where Family='Test Family1' LIMIT 1];
        List<String> productFamilyList = new List<String>();
        productFamilyList.add(prod.Family);
        
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts(null,null,new List<String>(),productFamilyList,null,null);
        Test.stopTest();
    }
    
    @isTest
    static void testSearchSerializedProductsWithProductFamilyAndLocationType(){
        Schema.Location loc =[SELECT Id,Name,LocationType FROM Location WHERE LocationType ='Van' LIMIT 1];
        List<String> locationTypeList = new List<String>();
        locationTypeList.add(loc.locationType);
        Product2 prod = [SELECT Id,Name,Family From Product2 LIMIT 1];
        List<String> productFamilyList = new List<String>();
        productFamilyList.add(prod.Family);
        
        Test.startTest();
        List<SerializedProduct> result = SerializedProductTransferController.searchSerializedProducts(null,null,locationTypeList,productFamilyList,null,null);
        Test.stopTest();
    }
    
    @isTest
    static void testCreateProductTransferRecords(){
        Map<Id,Id> SerializedProductMap =new Map<Id,Id>();
        List<SerializedProduct> SerializedProducts = [SELECT Id,Product2Id,ProductItemId,ProductItem.LocationId FROM SerializedProduct];
        for(SerializedProduct sp : SerializedProducts){
            SerializedProductMap.put(sp.Id,sp.ProductItemId);
        }
        //Prepare productTransforWrapper list
        List<SerializedProductTransferController.ProductTransferWrapper>wrappers = new List<SerializedProductTransferController.ProductTransferWrapper>();
        SerializedProductTransferController.ProductTransferWrapper wrapper = new SerializedProductTransferController.ProductTransferWrapper();
        wrapper.Product2Id = SerializedProducts[0].Product2Id;
        wrapper.sourceProductItemId = SerializedProducts[0].ProductItemId;
        wrapper.destinationLocationId = SerializedProducts[0].ProductItem.LocationId;
        wrapper.quantitySent =1;
        wrappers.add(wrapper);
        
        Test.startTest();
        SerializedProductTransferController.createProductTransferRecords(wrappers, serializedProductMap);
        Test.stopTest();
        //Asset that the productTransfer records have been created
        List<ProductTransfer> productTransfers = [SELECT Id FROM ProductTransfer];
        System.assertEquals(1,productTransfers.size(),'There should be one product transfer record created');
    }
    
    @isTest
    static void testUpdateProductTransferRecords(){
        ProductTransfer pt = new ProductTransfer(
            Product2Id =[SELECT Id FROM Product2 LIMIT 1].Id,
            SourceProductItemId = [SELECT Id FROM ProductItem LIMIT 1].Id,
            DestinationLocationId=[SELECT Id FROM Location LIMIT 1].Id,
            QuantitySent = 1
            
        );
        Insert pt;
        //Get Existing product transfor records
        List<ProductTransfer> ptRecords = [SELECT Id,isSent FROM ProductTransfer WHERE Id =:pt.Id];
        //Debug initial state of isSent
        // System.debug('Initial isSent value'+ptRecords[0].isSent);
        Test.startTest();
        SerializedProductTransferController.updateProductTransferRecords(ptRecords);
        Test.stopTest();
        
    }
    @isTest
    static void testGetDestinationLocationName(){
        Id locId = [SELECT Id FROM Location LIMIT 1].Id;
        Test.startTest();
        string locationName = SerializedProductTransferController.getDestinationLocationName(locId);
        Test.stopTest();
        System.assertNotEquals(null,locationName,'Location name should not be null');
        System.assertEquals('Test Location1',locationName,'Excepted location name to be Test Location1');
    }
    @isTest
    static void testGetProductItemLocations(){
        List<Id> ProductItemIds = new List<Id>{[SELECT Id,ProductName,QuantityOnHand,Location.Name,Location.VisitorAddressId,Location.VisitorAddress.State,Location.VisitorAddress.Street FROM ProductItem LIMIT 1].Id};
            try{Test.startTest();
                List<ProductItem> locations = SerializedProductTransferController.getProductItemLocations(productItemIds);
               }catch (Exception e) {
                   throw new AuraHandledException(e.getMessage());
               }
        Test.stopTest();
        
    }
}