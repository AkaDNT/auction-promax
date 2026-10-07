Set-StrictMode -Version Latest

# Tooling metadata only: importing this module never connects to PostgreSQL.
function Get-LocalDatabaseTopology {
    @(
        @{ Prefix='IDENTITY_DB'; Label='Identity development'; Db='identity_db'; Schema='identity'; Owner='identity_owner'; Migrator='identity_migrator'; App='identity_app' },
        @{ Prefix='IDENTITY_TEST_DB'; Label='Identity integration test'; Db='identity_test_db'; Schema='identity'; Owner='identity_test_owner'; Migrator='identity_test_migrator'; App='identity_test_app' },
        @{ Prefix='AUCTION_DB'; Label='Auction development'; Db='auction_db'; Schema='auction'; Owner='auction_owner'; Migrator='auction_migrator'; App='auction_app' },
        @{ Prefix='AUCTION_TEST_DB'; Label='Auction integration test'; Db='auction_test_db'; Schema='auction'; Owner='auction_test_owner'; Migrator='auction_test_migrator'; App='auction_test_app' },
        @{ Prefix='BIDDING_DB'; Label='Bidding development'; Db='bidding_db'; Schema='bidding'; Owner='bidding_owner'; Migrator='bidding_migrator'; App='bidding_app' },
        @{ Prefix='BIDDING_TEST_DB'; Label='Bidding integration test'; Db='bidding_test_db'; Schema='bidding'; Owner='bidding_test_owner'; Migrator='bidding_test_migrator'; App='bidding_test_app' },
        @{ Prefix='BILLING_DB'; Label='Billing development'; Db='billing_db'; Schema='billing'; Owner='billing_owner'; Migrator='billing_migrator'; App='billing_app' },
        @{ Prefix='BILLING_TEST_DB'; Label='Billing integration test'; Db='billing_test_db'; Schema='billing'; Owner='billing_test_owner'; Migrator='billing_test_migrator'; App='billing_test_app' }
    )
}

Export-ModuleMember -Function Get-LocalDatabaseTopology
