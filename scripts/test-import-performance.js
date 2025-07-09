#!/usr/bin/env node

/**
 * SMS Contact Import Performance Test Script
 * 
 * This script helps test the performance of the contact import functionality
 * by generating test CSV files of various sizes.
 */

const fs = require('fs');
const path = require('path');

// French data for realistic testing
const frenchFirstNames = [
  'Pierre', 'Marie', 'Jean', 'Sophie', 'Michel', 'Catherine', 'Nicolas', 'Isabelle',
  'Philippe', 'Nathalie', 'Antoine', 'Sylvie', 'Laurent', 'Françoise', 'Christophe',
  'Patricia', 'Julien', 'Sandrine', 'Stéphane', 'Valérie', 'Sébastien', 'Christine',
  'David', 'Martine', 'Olivier', 'Monique', 'Frédéric', 'Brigitte', 'Alexandre',
  'Véronique', 'Patrick', 'Dominique', 'Pascal', 'Jacqueline', 'Thierry', 'Chantal'
];

const frenchLastNames = [
  'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand',
  'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefèvre',
  'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Garnier'
];

const frenchCities = [
  'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier',
  'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble',
  'Dijon', 'Angers', 'Nîmes', 'Villeurbanne', 'Le Mans', 'Aix-en-Provence', 'Clermont-Ferrand',
  'Brest', 'Tours', 'Limoges', 'Amiens', 'Perpignan', 'Metz', 'Besançon', 'Orléans', 'Rouen'
];

const frenchStreets = [
  'Rue de la Paix', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain', 'Rue de Rivoli',
  'Avenue Montaigne', 'Rue du Faubourg Saint-Honoré', 'Boulevard Voltaire', 'Rue de la République',
  'Avenue de la Liberté', 'Place de la Bastille', 'Rue Victor Hugo', 'Boulevard Haussmann',
  'Rue de la Gare', 'Avenue Jean Jaurès', 'Rue Nationale', 'Boulevard de la République'
];

const frenchCompanies = [
  'Tech France SARL', 'Innovation Solutions', 'Digital Pro', 'France Business',
  'Solutions Avancées', 'Technologie Moderne', 'Services Premium', 'Développement Plus',
  'Consulting Expert', 'Management Pro', 'Stratégie Digitale', 'Performance Solutions'
];

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateFrenchPhoneNumber() {
  // Generate French mobile numbers (+33 6xx xxx xxx or +33 7xx xxx xxx)
  const prefix = Math.random() > 0.5 ? '6' : '7';
  const number = prefix + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return '+33' + number;
}

function generatePostalCode() {
  return (Math.floor(Math.random() * 95000) + 1000).toString().padStart(5, '0');
}

function generateContact() {
  const firstName = getRandomItem(frenchFirstNames);
  const lastName = getRandomItem(frenchLastNames);
  const phoneNumber = generateFrenchPhoneNumber();
  const address = Math.floor(Math.random() * 999) + 1 + ' ' + getRandomItem(frenchStreets);
  const city = getRandomItem(frenchCities);
  const zipCode = generatePostalCode();
  const company = getRandomItem(frenchCompanies);
  const department = getRandomItem(['Ventes', 'Marketing', 'IT', 'Support', 'Direction', 'Comptabilité']);
  
  return {
    phoneNumber,
    firstName,
    lastName,
    address,
    city,
    zipCode,
    company,
    department,
    notes: `Contact professionnel de ${company}`
  };
}

function generateCSV(count, filename) {
  console.log(`Generating ${count} contacts for ${filename}...`);
  
  const headers = [
    'phoneNumber', 'firstName', 'lastName', 'address', 'city', 'zipCode', 
    'company', 'department', 'notes'
  ];
  
  let csvContent = headers.join(',') + '\n';
  
  // Add special test numbers for simulation
  const testNumbers = [
    '+33123456789,Test,Success,1 Rue Test,Paris,75001,Test Company,Test,Always succeeds in simulation',
    '+33987654321,Test,Fail,2 Rue Test,Lyon,69001,Test Company,Test,Always fails in simulation',
    '+33555666777,Test,Blacklist,3 Rue Test,Marseille,13001,Test Company,Test,Blacklisted in simulation',
    '+33444555666,Test,RateLimit,4 Rue Test,Toulouse,31000,Test Company,Test,Rate limited in simulation'
  ];
  
  testNumbers.forEach(line => {
    csvContent += line + '\n';
  });
  
  // Generate random contacts
  for (let i = 0; i < count - 4; i++) {
    const contact = generateContact();
    const row = headers.map(field => {
      const value = contact[field] || '';
      // Escape commas and quotes in CSV
      if (value.includes(',') || value.includes('"')) {
        return '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    }).join(',');
    
    csvContent += row + '\n';
    
    if (i % 1000 === 0 && i > 0) {
      console.log(`Generated ${i + 4} contacts...`);
    }
  }
  
  const filePath = path.join(__dirname, '..', 'public', filename);
  fs.writeFileSync(filePath, csvContent);
  console.log(`✅ Generated ${filename} with ${count} contacts (${Math.round(csvContent.length / 1024)} KB)`);
  
  return filePath;
}

function main() {
  console.log('🚀 SMS Contact Import Performance Test Generator\n');
  
  // Generate different sized test files
  const testSizes = [
    { count: 100, name: 'test-contacts-100.csv' },
    { count: 500, name: 'test-contacts-500.csv' },
    { count: 1000, name: 'test-contacts-1k.csv' },
    { count: 2500, name: 'test-contacts-2.5k.csv' },
    { count: 5000, name: 'test-contacts-5k.csv' },
    { count: 10000, name: 'test-contacts-10k.csv' }
  ];
  
  console.log('Generating performance test files...\n');
  
  testSizes.forEach(({ count, name }) => {
    const startTime = Date.now();
    generateCSV(count, name);
    const endTime = Date.now();
    console.log(`Generated in ${((endTime - startTime) / 1000).toFixed(2)}s\n`);
  });
  
  console.log('📊 Performance Testing Guide:');
  console.log('1. Use test-contacts-100.csv for quick functionality tests');
  console.log('2. Use test-contacts-1k.csv for moderate performance tests');
  console.log('3. Use test-contacts-5k.csv for stress testing');
  console.log('4. Use test-contacts-10k.csv for maximum performance testing');
  console.log('\n🎯 Expected Performance (with optimizations):');
  console.log('- 100 contacts: ~1-2 seconds');
  console.log('- 1,000 contacts: ~5-10 seconds');
  console.log('- 5,000 contacts: ~20-30 seconds');
  console.log('- 10,000 contacts: ~40-60 seconds');
  console.log('\n⚡ Features being tested:');
  console.log('- Parallel chunk processing (3 concurrent chunks)');
  console.log('- Bulk database operations (insertMany, bulkWrite)');
  console.log('- Real-time progress updates');
  console.log('- French phone number validation');
  console.log('- Custom field mapping');
  console.log('- Duplicate detection and handling');
}

if (require.main === module) {
  main();
}

module.exports = { generateCSV, generateContact }; 