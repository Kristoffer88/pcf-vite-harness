# Failing Integration Tests Summary

## Overview
There are 4 failing integration tests across 2 test files:
- `dataset-injection.test.ts` (2 failures)
- `dataset-refresh.test.ts` (2 failures)

## Failing Tests Details

### 1. Dataset Injection Tests (`dataset-injection.test.ts`)

#### Test 1: "should inject records into a dataset"
**Error**: `Failed to inject records into dataset: Error: Failed to fetch metadata for entity: undefined`
- **Root Cause**: The `queryResult` object is missing the `entityLogicalName` property
- **Location**: `datasetInjector.ts:42` -> `datasetEnhancer.ts:30`
- **Issue**: When calling `convertEntitiesToDatasetRecords`, the `entityLogicalName` parameter is undefined

#### Test 2: "should detect entity type from records"
**Error**: Same as Test 1 - `Failed to fetch metadata for entity: undefined`
- **Root Cause**: Same issue - missing `entityLogicalName` in the `queryResult`
- **Expected**: The test expects `getTargetEntityType()` to return 'account'
- **Actual**: Returns 'unknown' because the injection fails

### 2. Dataset Refresh Tests (`dataset-refresh.test.ts`)

#### Test 3: "should fetch contacts related to account"
**Error**: API request returns 400 Bad Request
- **Root Cause**: Invalid OData filter syntax in the query
- **Query**: `/api/data/v9.1/contacts?$select=fullname,contactid&$filter=parentaccountid/accountid eq ${accountId}&$top=10`
- **Issue**: The filter syntax `parentaccountid/accountid` is incorrect for filtering by lookup fields

#### Test 4: "should build correct filtered query for related records"
**Error**: Same as Test 3 - API returns 400 Bad Request
- **Root Cause**: Incorrect filter syntax for lookup fields
- **Query**: `/api/data/v9.1/contacts?$select=fullname,contactid&$filter=_parentaccountid_value eq ${parentAccountId}&$top=10`
- **Issue**: Missing quotes around the GUID value in the filter

### 3. Form Discovery Tests (Additional failures in full test run)

#### Test 5: "should filter by entity type code when provided" (`form-discovery.test.ts`)
**Error**: `A binary operator with incompatible types was detected. Found operand types 'Edm.String' and 'Edm.Int32' for operator kind 'Equal'`
- **Root Cause**: Type mismatch in OData query
- **Issue**: `objecttypecode eq ${filterOptions.entityTypeCode}` - comparing string field with number without quotes

#### Test 6: "should support backward compatibility with number parameter" (`form-discovery-filtering.test.js`)
**Error**: Same type mismatch error as Test 5
- **Root Cause**: Same issue with entity type code comparison

## Required Fixes

1. **Dataset Injection**: Add `entityLogicalName` to the `QueryResult` objects in tests
2. **Dataset Refresh**: Fix OData filter syntax for lookup fields (use `_parentaccountid_value` and quote GUIDs)
3. **Form Discovery**: Quote the entity type code in OData queries when comparing with `objecttypecode`

## Impact
These failures prevent:
- Proper dataset injection functionality
- Querying related records through lookups
- Form discovery filtering by entity type code