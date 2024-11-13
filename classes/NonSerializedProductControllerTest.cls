@isTest
public class NonSerializedProductControllerTest {
    @testSetup
    static void setupTestData() {
        // Create sample Product records
        Product2 prod1 = new Product2(Name = 'Test Product1', Family = 'Test Family1',IsActive = true);
        Product2 prod2 = new Product2(Name = 'Test Product2', Family = 'Test Family2',IsActive = true);
        insert new List<Product2>{prod1,prod2};
            
        // Create test data for Locations
        Schema.Location loc1 = new Schema.Location(Name = 'Test Location1', LocationType = 'Inventory',IsInventoryLocation = true);
        Schema.Location loc2 = new Schema.Location(Name = 'Test Location2', LocationType = 'Van',IsInventoryLocation = true,IsMobile = true);
        insert new List<Schema.Location>{loc1,loc2};
            
        // Create test data for ProductItem
        ProductItem prodItem1 = new ProductItem(Product2Id = prod1.Id, LocationId=loc1.Id,QuantityOnHand = 0);
        ProductItem prodItem2 = new ProductItem(Product2Id = prod2.Id, LocationId=loc2.Id,QuantityOnHand = 0);
        insert new List<ProductItem>{prodItem1,prodItem2};
            }
    
    @isTest
    static void testSearchProductItems() {
        Test.startTest();
        
        // Test case with ProductItemNumber
        List<ProductItem> results = NonSerializedProductTransferController.searchProductItems('', '', new List<String>(), new List<String>(), 'PI-001');
        
        // Test case with ProductName and LocationName
        results = NonSerializedProductTransferController.searchProductItems('Test Product', 'Test Location 1', new List<String>(), new List<String>(), '');
        
        // Test case with ProductFamily
        results = NonSerializedProductTransferController.searchProductItems('Test Product', 'Test Location 1', new List<String>(), new List<String>{'Test Family'}, '');
        
        // Test case with LocationType
        results = NonSerializedProductTransferController.searchProductItems('Test Product', 'Test Location 1', new List<String>{'Warehouse'}, new List<String>(), '');
        
        Test.stopTest();
    }
    
    @isTest
    static void testGetProductItems() {
        Test.startTest();
        List<ProductItem> productItems = NonSerializedProductTransferController.getProductItems();
        Test.stopTest();
    }
    
    @isTest
    static void testGetDestinationLocationName() {
        Test.startTest();
        List<Schema.Location> locations = [SELECT Id FROM Location LIMIT 1];
        String locationName = NonSerializedProductTransferController.getDestinationLocationName(locations[0].Id);
        Test.stopTest();
    }
    
    @isTest
    static void testCreateProductTransferRecords() {
        Test.startTest();
        
        List<ProductItem> productItems = [SELECT Id, Product2Id, LocationId FROM ProductItem LIMIT 2];
        NonSerializedProductTransferController.ProductTransferWrapper wrapper = new NonSerializedProductTransferController.ProductTransferWrapper();
        wrapper.product2Id = productItems[0].Product2Id;
        wrapper.sourceProductItemId = productItems[0].Id;
        wrapper.destinationLocationId = productItems[1].LocationId;
        wrapper.quantitySent = 10;
        
        NonSerializedProductTransferController.createProductTransferRecords(new List<NonSerializedProductTransferController.ProductTransferWrapper> { wrapper });
        
        List<ProductTransfer> transfers = [SELECT Id, QuantitySent FROM ProductTransfer WHERE SourceProductItemId = :productItems[0].Id];
        System.assertEquals(1, transfers.size(), 'One Product Transfer record should be created.');
        System.assertEquals(10, transfers[0].QuantitySent, 'The quantity sent should match the input.');
        
        Test.stopTest();
    }
    
    @isTest
    static void testGetProductItemLocations() {
        Test.startTest();
        
        List<ProductItem> productItems = [SELECT Id FROM ProductItem LIMIT 1];
        List<ProductItem> locations = NonSerializedProductTransferController.getProductItemLocations(new List<Id> { productItems[0].Id });
        Test.stopTest();
    }
    
    @isTest
    static void testProductItemWithProductFamilyAndLocationType(){
        Schema.Location loc =[SELECT Id,Name,LocationType FROM Location WHERE LocationType ='Van' LIMIT 1];
        List<String> locationTypeList = new List<String>();
        locationTypeList.add(loc.locationType);
        Product2 prod = [SELECT Id,Name,Family From Product2 LIMIT 1];
        List<String> productFamilyList = new List<String>();
        productFamilyList.add(prod.Family);
        
        Test.startTest();
        List<ProductItem> result = NonSerializedProductTransferController.searchProductItems(null,null,locationTypeList,productFamilyList,null);
        Test.stopTest();
    }
    @isTest
    static void testSearchProductItemsWithNoFilters(){
        Test.startTest();
        List<ProductItem> result = NonSerializedProductTransferController.searchProductItems(null,null,new List<String>(),new List<String>(),null);
        Test.stopTest();
    }
    
}