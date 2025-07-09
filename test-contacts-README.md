# Test Contacts CSV Files

This directory contains comprehensive test contact files for testing SMS campaigns and contact import functionality.

## 📁 Files Generated

### `test-contacts-10k.csv` (1.19 MB)
- **10,008 contacts** for large-scale campaign testing
- Realistic data with international phone numbers
- Perfect for testing high-volume SMS campaigns and queue processing

### `test-contacts-sample.csv` (12.27 KB)  
- **100 contacts** for quick testing and development
- Same data structure as the large file
- Ideal for initial testing and debugging

## 📊 Data Schema

The CSV files match your contact import schema exactly:

```csv
phoneNumber,firstName,lastName,address,city,zipCode,dateOfBirth,company,department,notes
```

### Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `phoneNumber` | String | International format with country code | `+1234567890123` |
| `firstName` | String | Contact's first name | `John` |
| `lastName` | String | Contact's last name | `Smith` |
| `address` | String | Street address | `"123 Main Street"` |
| `city` | String | City name | `New York` |
| `zipCode` | String | Postal/ZIP code (format varies by country) | `12345` or `SW1A 1AA` |
| `dateOfBirth` | Date | Birth date in YYYY-MM-DD format | `1990-01-15` |
| `company` | String | Company name (custom field) | `Tech Solutions Inc` |
| `department` | String | Department name (custom field) | `Sales` |
| `notes` | String | Additional notes (custom field) | `"VIP customer"` |

## 🌍 International Coverage

The test data includes contacts from 10 countries with realistic phone number formats:

| Country | Code | Phone Format | ZIP Format | Sample |
|---------|------|--------------|------------|---------|
| **United States** | +1 | +1XXXXXXXXXX | 12345 | +12125551234 |
| **Canada** | +1 | +1XXXXXXXXXX | K1A 0A6 | +14165551234 |
| **United Kingdom** | +44 | +44XXXXXXXXXX | SW1A 1AA | +442071234567 |
| **France** | +33 | +33XXXXXXXXX | 75001 | +33123456789 |
| **Germany** | +49 | +49XXXXXXXXXX | 10115 | +491234567890 |
| **Italy** | +39 | +39XXXXXXXXXX | 00100 | +39123456789 |
| **Spain** | +34 | +34XXXXXXXXX | 28001 | +34123456789 |
| **Netherlands** | +31 | +31XXXXXXXXX | 1000 AA | +31123456789 |
| **Belgium** | +32 | +32XXXXXXXXX | 1000 | +32123456789 |
| **Switzerland** | +41 | +41XXXXXXXXX | 8000 | +41123456789 |

## 🧪 Special Test Numbers

The files include **8 special test numbers** at the beginning for simulation testing:

### Always Succeed Numbers (ending in 1111)
```csv
+1234567891111,Test,Success,"123 Success Street",Test City,12345,1990-01-01,Test Company,Testing,"Always succeeds in simulation"
+4412345671111,John,AlwaysWorks,"10 Success Lane",London,SW1A 1AA,1985-05-15,UK Test Ltd,Sales,"UK test number - always succeeds"
```

### Always Fail Numbers (ending in 0000)
```csv
+1234567890000,Test,Failure,"456 Failure Avenue",Test City,12345,1990-01-02,Test Company,Testing,"Always fails in simulation"
+3312345670000,Marie,NeverWorks,"20 Échec Rue",Paris,75001,1988-03-20,Test France,Marketing,"French test number - always fails"
```

### Blacklisted Numbers (ending in 9999)
```csv
+1234567899999,Test,Blacklist,"789 Blacklist Road",Test City,12345,1990-01-03,Test Company,Testing,"Blacklisted in simulation"
+4912345679999,Hans,Gesperrt,"30 Blacklist Straße",Berlin,10115,1992-07-10,Test GmbH,IT,"German test number - blacklisted"
```

### Rate Limited Numbers (ending in 8888)
```csv
+1234567898888,Test,RateLimit,"321 Rate Limit Lane",Test City,12345,1990-01-04,Test Company,Testing,"Triggers rate limit in simulation"
+3912345678888,Marco,Limitato,"40 Limite Via",Rome,00100,1987-11-25,Test Italia,Support,"Italian test number - rate limited"
```

## 🚀 How to Use

### 1. Import into Contact Lists
1. Go to SMS → Contact Lists
2. Create a new contact list or select existing one
3. Click "Import Contacts"
4. Upload `test-contacts-sample.csv` for testing or `test-contacts-10k.csv` for large campaigns
5. Map columns:
   - **Phone Number** → `phoneNumber` (required)
   - **First Name** → `firstName`
   - **Last Name** → `lastName`
   - **Address** → `address`
   - **City** → `city`
   - **ZIP Code** → `zipCode`
   - **Date of Birth** → `dateOfBirth`
   - **Company** → `company` (custom field)
   - **Department** → `department` (custom field)
   - **Notes** → `notes` (custom field)

### 2. Test SMS Campaigns
1. Create a new SMS campaign
2. Select your imported contact list
3. Choose a simulation provider:
   - **Premium SMS Simulation** (98% success)
   - **Standard SMS Simulation** (94% success)
   - **Budget SMS Simulation** (88% success)
   - **Testing SMS Simulation** (90% success)
4. Create your message template using variables:
   ```
   Hello {{firstName}} {{lastName}}! 
   Your order will be delivered to {{address}}, {{city}} {{zipCode}}.
   From {{company}} {{department}}
   ```

### 3. Monitor Results
- Use the Queue Monitor to watch campaign processing
- Special test numbers will show predictable results:
  - Numbers ending in **1111**: ✅ Always succeed
  - Numbers ending in **0000**: ❌ Always fail
  - Numbers ending in **9999**: 🚫 Blacklisted
  - Numbers ending in **8888**: ⚡ Rate limited

## 📈 Testing Scenarios

### Scenario 1: Quick Functionality Test
- **File**: `test-contacts-sample.csv` (100 contacts)
- **Provider**: Testing SMS Simulation
- **Expected**: Fast processing, 90% success rate
- **Use Case**: Verify import and basic campaign functionality

### Scenario 2: High-Volume Campaign Test
- **File**: `test-contacts-10k.csv` (10,008 contacts)
- **Provider**: Standard SMS Simulation
- **Expected**: 2-5 minutes processing, 94% success rate
- **Use Case**: Test queue system, rate limiting, and performance

### Scenario 3: Provider Comparison Test
- **File**: `test-contacts-sample.csv`
- **Multiple Campaigns**: Same contacts with different providers
- **Expected**: Different success rates and processing speeds
- **Use Case**: Compare simulation provider behaviors

### Scenario 4: Error Handling Test
- **File**: `test-contacts-sample.csv`
- **Focus**: Special test numbers (first 8 contacts)
- **Expected**: Predictable failures and rate limiting
- **Use Case**: Verify error handling and retry logic

## 📊 Expected Results

### With 10,000 Contacts Using Standard Provider (94% success):
- **Successful**: ~9,400 messages
- **Failed**: ~600 messages
- **Processing Time**: 2-5 minutes
- **Rate**: 45-135 messages/second

### Special Test Numbers Results:
- **Always Succeed (1111)**: 100% success rate
- **Always Fail (0000)**: 0% success rate
- **Blacklisted (9999)**: Blocked before sending
- **Rate Limited (8888)**: Delayed or failed due to limits

## 🔧 Customization

### Generate Custom Test Data
You can modify the generation script to create custom test files:

```bash
# Generate different sizes
node -e "/* modify the script to change contact count */"

# Add different countries
# Modify the countries array in the generation script

# Add custom fields
# Modify the CSV header and data generation
```

### Custom Field Mapping
The files include custom fields that can be mapped during import:
- **company**: Business/organization name
- **department**: Department or role
- **notes**: Additional information or tags

## 🎯 Best Practices

### For Development
1. Start with `test-contacts-sample.csv` for initial testing
2. Use special test numbers to verify specific behaviors
3. Test different simulation providers to understand characteristics

### For Performance Testing
1. Use `test-contacts-10k.csv` for load testing
2. Monitor queue statistics during processing
3. Test with multiple concurrent campaigns

### For Demo/Sales
1. Use `test-contacts-sample.csv` for quick demos
2. Highlight special test numbers to show error handling
3. Demonstrate different provider success rates

## 🚨 Important Notes

### Data Privacy
- All data is **completely fictional**
- Phone numbers are **not real** and will not send actual SMS
- Safe to use for testing and development

### Simulation Mode
- These files are designed for **simulation providers only**
- Do not use with real SMS providers (would incur costs)
- Special test numbers only work with simulation providers

### File Handling
- CSV files use proper escaping for commas in addresses/notes
- UTF-8 encoding for international characters
- Standard CSV format compatible with Excel and other tools

## 📞 Support

If you need different test data formats or additional fields:
1. Modify the generation script in the previous command
2. Adjust the contact schema in your import module
3. Update column mapping in the import interface

These test files provide comprehensive coverage for testing all aspects of your SMS system, from basic contact import to high-volume campaign processing! 🚀 