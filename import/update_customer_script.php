<?php

require __DIR__ . '/vendor/autoload.php';
$mongo = new MongoDB\Client("mongodb://crmuser:crmuser@159.65.148.28:27017/konspecCRMPB");
$collection = $mongo->konspecCRMPB->customer;
// Open file
$file = fopen('script_customer.csv', 'r');
// Remove the headers.
$headers = fgetcsv($file);
try {
    while (($customerCollectionDetails = fgetcsv($file)) !== false) {
        // Check if customer code already exists in collection
        $existingCustomer = $collection->findOne(['customer_code' => "$customerCollectionDetails[0]"]);
        if ($existingCustomer) {
            $updateStatus = $collection->updateOne(['customer_code' => "$customerCollectionDetails[0]"], ['$set' => [
                'responsibility_matrix.primary_account_manager' => $customerCollectionDetails[1],
                'responsibility_matrix.primary_field_coordinator' => $customerCollectionDetails[2],
                'responsibility_matrix.primary_biss_development' => $customerCollectionDetails[3],
                'responsibility_matrix.primary_technical_services' => $customerCollectionDetails[4],
                'responsibility_matrix.primary_product_development' => $customerCollectionDetails[5],
                'responsibility_matrix.primary_door_opener' => $customerCollectionDetails[6],
                'responsibility_matrix.primary_salesOps' => $customerCollectionDetails[7],
                'responsibility_matrix.secondary_account_manager' => $customerCollectionDetails[8],
                'responsibility_matrix.secondary_field_coordinator' => $customerCollectionDetails[9],
                'responsibility_matrix.secondary_biss_development' => $customerCollectionDetails[10],
                'responsibility_matrix.secondary_technical_services' => $customerCollectionDetails[11],
                'responsibility_matrix.secondary_product_development' => $customerCollectionDetails[12],
                'responsibility_matrix.secondary_door_opener' => $customerCollectionDetails[13],
                'responsibility_matrix.secondary_salesOps' => $customerCollectionDetails[14],
                'responsibility_matrix.tertiary_account_manager' => $customerCollectionDetails[15],
                'responsibility_matrix.tertiary_field_coordinator' => $customerCollectionDetails[16],
                'responsibility_matrix.tertiary_biss_development' => $customerCollectionDetails[17],
                'responsibility_matrix.tertiary_technical_services' => $customerCollectionDetails[18],
                'responsibility_matrix.tertiary_product_development' => $customerCollectionDetails[19],
                'responsibility_matrix.tertiary_door_opener' => $customerCollectionDetails[20],
                'responsibility_matrix.tertiary_salesOps' => $customerCollectionDetails[21]
            ]]);
            if ($updateStatus) {
                echo "Records updated for the customer code:" .  $customerCollectionDetails[0];
                echo "\n";
            }
        } else {
            echo "Records missing for the customer code:" .  $customerCollectionDetails[0];
            echo "\n";
        }
    }

// close file and MongoDB connection
fclose($file);
unset($mongo);
} catch (Exception $e) {
    echo 'Caught exception: ',  $e->getMessage(), "\n";
}

?>
