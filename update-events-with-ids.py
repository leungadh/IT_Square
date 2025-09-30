#!/usr/bin/env python3
"""
Script to update existing MediaInvites records with proper IDs and structure
Run this after updating your main program to fix any existing records
"""

import boto3
import json
from datetime import datetime
from decimal import Decimal

# AWS Configuration
REGION = 'ap-east-1'
TABLE_NAME = 'Mediainvites'

def decimal_default(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def generate_event_id(event_date_str, sequence=1):
    """Generate a unique event ID from date string"""
    try:
        # Parse date string (assuming YYYY-MM-DD format)
        date_obj = datetime.strptime(event_date_str, '%Y-%m-%d')
        date_str = date_obj.strftime("%Y%m%d")
        return f"event_{date_str}_{sequence:03d}"
    except:
        # Fallback to timestamp-based ID
        timestamp = int(datetime.now().timestamp())
        return f"event_{timestamp}_{sequence:03d}"

def ensure_bilingual_field(value, default_text=""):
    """Ensure a field has proper bilingual structure"""
    if isinstance(value, dict) and 'en' in value and 'zh' in value:
        return value
    elif isinstance(value, str):
        return {"en": value, "zh": value}
    else:
        return {"en": default_text, "zh": default_text}

def fix_speakers_vips(items, item_type='speakers'):
    """Fix speakers or VIPs structure"""
    if not isinstance(items, list):
        return []
    
    fixed_items = []
    for item in items:
        if isinstance(item, dict):
            fixed_item = {}
            
            # Fix name field
            if 'name' in item:
                fixed_item['name'] = ensure_bilingual_field(item['name'])
            else:
                fixed_item['name'] = {"en": "Unknown", "zh": "未知"}
            
            # Fix theme/role field
            theme_role_key = 'theme' if item_type == 'speakers' else 'role'
            if theme_role_key in item:
                fixed_item[theme_role_key] = ensure_bilingual_field(item[theme_role_key])
            else:
                default_value = "Presentation" if item_type == 'speakers' else "Guest"
                fixed_item[theme_role_key] = {"en": default_value, "zh": default_value}
            
            fixed_items.append(fixed_item)
    
    return fixed_items

def fix_event_record(item):
    """Fix an event record to match the proper schema"""
    fixed_item = {}
    
    # Generate proper ID if missing or invalid
    if 'id' not in item or not item['id'] or item['id'] == 'N/A':
        if 'date' in item:
            fixed_item['id'] = generate_event_id(item['date'])
        else:
            fixed_item['id'] = f"event_{int(datetime.now().timestamp())}_001"
    else:
        fixed_item['id'] = str(item['id'])
    
    # Fix required bilingual fields
    required_bilingual = ['event_name', 'location', 'description', 'time']
    for field in required_bilingual:
        if field in item:
            fixed_item[field] = ensure_bilingual_field(item[field])
        else:
            fixed_item[field] = {"en": f"Missing {field}", "zh": f"缺少{field}"}
    
    # Copy simple fields
    simple_fields = ['date', 'language', 'hyperlink']
    for field in simple_fields:
        if field in item:
            fixed_item[field] = str(item[field]) if item[field] else ""
        else:
            fixed_item[field] = ""
    
    # Fix transportation (optional bilingual field)
    if 'transportation' in item and item['transportation']:
        fixed_item['transportation'] = ensure_bilingual_field(item['transportation'])
    
    # Fix category (ensure it's an array)
    if 'category' in item:
        if isinstance(item['category'], list):
            fixed_item['category'] = [str(cat) for cat in item['category']]
        elif isinstance(item['category'], str):
            fixed_item['category'] = [item['category']]
        else:
            fixed_item['category'] = []
    else:
        fixed_item['category'] = []
    
    # Fix speakers and VIPs
    if 'speakers' in item:
        fixed_item['speakers'] = fix_speakers_vips(item['speakers'], 'speakers')
    else:
        fixed_item['speakers'] = []
    
    if 'vips' in item:
        fixed_item['vips'] = fix_speakers_vips(item['vips'], 'vips')
    else:
        fixed_item['vips'] = []
    
    return fixed_item

def scan_and_fix_table():
    """Scan the table and fix all records"""
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    print(f"🔍 Scanning table: {TABLE_NAME}")
    
    try:
        # Scan the table
        response = table.scan()
        items = response['Items']
        
        print(f"📊 Found {len(items)} records")
        
        if len(items) == 0:
            print("⚠️  No records found in the table")
            return
        
        print("\n📋 Current records:")
        for i, item in enumerate(items, 1):
            print(f"{i}. ID: {item.get('id', 'NO_ID')} | Date: {item.get('date', 'NO_DATE')} | Name: {item.get('event_name', 'NO_NAME')}")
        
        # Ask for confirmation
        print(f"\n❓ Do you want to fix these {len(items)} records? (y/N): ", end="")
        confirm = input().strip().lower()
        
        if confirm != 'y':
            print("❌ Operation cancelled")
            return
        
        # Fix each record
        fixed_count = 0
        for item in items:
            try:
                print(f"\n🔧 Fixing record: {item.get('id', 'NO_ID')}")
                
                # Fix the record
                fixed_item = fix_event_record(item)
                
                # Show what changed
                print(f"   Old ID: {item.get('id', 'NO_ID')} -> New ID: {fixed_item['id']}")
                print(f"   Event: {fixed_item['event_name']['en']}")
                print(f"   Date: {fixed_item['date']}")
                print(f"   Categories: {fixed_item['category']}")
                
                # Save the fixed record
                table.put_item(Item=fixed_item)
                fixed_count += 1
                print(f"   ✅ Fixed and saved")
                
            except Exception as e:
                print(f"   ❌ Error fixing record: {e}")
        
        print(f"\n🎉 Successfully fixed {fixed_count} out of {len(items)} records")
        
        # Show final status
        print("\n📊 Final verification:")
        response = table.scan()
        final_items = response['Items']
        
        for i, item in enumerate(final_items, 1):
            event_name = item.get('event_name', {})
            if isinstance(event_name, dict):
                name = event_name.get('en', 'NO_NAME')
            else:
                name = str(event_name)
            
            print(f"{i}. ✅ ID: {item.get('id')} | Date: {item.get('date')} | Name: {name}")
        
    except Exception as e:
        print(f"❌ Error scanning table: {e}")

def test_appsync_connection():
    """Test if we can now fetch events from AppSync"""
    print("\n🧪 Testing AppSync connection with fixed IDs...")
    
    # Get a sample ID from the table
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    try:
        response = table.scan(Limit=1)
        if response['Items']:
            sample_id = response['Items'][0]['id']
            print(f"📋 Sample ID found: {sample_id}")
            print(f"🔗 Test this ID with: node test-media-events-api.js")
            print(f"   Or modify the test script to use ID: {sample_id}")
        else:
            print("⚠️  No records found to test with")
    except Exception as e:
        print(f"❌ Error getting sample ID: {e}")

if __name__ == "__main__":
    print("🔧 MediaInvites Record Fixer")
    print("=" * 50)
    
    scan_and_fix_table()
    test_appsync_connection()
    
    print("\n✨ Done! Your records should now be compatible with the AppSync schema.")
    print("💡 Next steps:")
    print("   1. Test with: node test-media-events-api.js")
    print("   2. Update your Python program to use the new schema")
    print("   3. Add the listMediaInvites resolver to AppSync")