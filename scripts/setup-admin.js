#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Missing required environment variables:');
  console.error(`  SUPABASE_URL: ${supabaseUrl ? '✓' : '✗'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRole ? '✓' : '✗'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  console.log("\n🔑 TheSet Admin Setup 🔑\n");
  
  // Get list of current admins
  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select('user_id');
    
  if (adminsError) {
    console.error('Error fetching admins:', adminsError.message);
    process.exit(1);
  }
  
  console.log(`Current admins in the system: ${admins.length}`);
  
  if (admins.length > 0) {
    console.log("\nExisting admins:");
    
    // Fetch user details for each admin
    for (const admin of admins) {
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        console.log(`  - ${admin.user_id} (Unable to fetch user details)`);
      } else {
        const user = users.find(u => u.id === admin.user_id);
        console.log(`  - ${user ? user.email : admin.user_id} (${admin.user_id})`);
      }
    }
  }
  
  // Ask for email to add as admin
  rl.question('\nEnter the email address of the user to make admin: ', async (email) => {
    if (!email) {
      console.log('No email provided. Exiting.');
      rl.close();
      return;
    }
    
    try {
      // Check if user exists with that email
      const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
      
      if (userError) {
        throw new Error(`Error fetching users: ${userError.message}`);
      }
      
      const user = users.find(u => u.email === email);
      
      if (!user) {
        console.log(`\n❌ No user found with email: ${email}`);
        console.log('\nAvailable users:');
        users.forEach(u => console.log(`  - ${u.email}`));
        rl.close();
        return;
      }
      
      // Check if user is already an admin
      const isExistingAdmin = admins.some(admin => admin.user_id === user.id);
      
      if (isExistingAdmin) {
        console.log(`\n✅ User ${email} is already an admin.`);
        rl.close();
        return;
      }
      
      // Add user to admins table
      const { error: insertError } = await supabase
        .from('admins')
        .insert([{ user_id: user.id }]);
        
      if (insertError) {
        throw new Error(`Error adding admin: ${insertError.message}`);
      }
      
      console.log(`\n✅ Successfully added ${email} as an admin!`);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
    } finally {
      rl.close();
    }
  });
}

main();

rl.on('close', () => {
  console.log('\nAdmin setup complete.\n');
  process.exit(0);
}); 