// Document Parser Service
// Extracts text content from various document formats

const mammoth = require('mammoth'); // For .docx files
const XLSX = require('xlsx'); // For Excel files
const fs = require('fs').promises;

/**
 * Parse a document file and extract text content
 * @param {string} filepath - Path to the document file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text content
 */
async function parseDocument(filepath, mimeType) {
  try {
    switch (mimeType) {
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
        return await parseDocx(filepath);
        
      case 'application/msword': // .doc
        return await parseDoc(filepath);
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': // .xlsx
        return await parseXlsx(filepath);
        
      case 'application/vnd.ms-excel': // .xls
        return await parseXls(filepath);
        
      case 'text/markdown': // .md
      case 'text/plain': // .txt
        return await parseText(filepath);
        
      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error parsing document ${filepath}:`, error);
    throw new Error(`Failed to parse document: ${error.message}`);
  }
}

/**
 * Parse .docx file using mammoth
 */
async function parseDocx(filepath) {
  try {
    const result = await mammoth.extractRawText({ path: filepath });
    
    if (!result.value || result.value.trim().length === 0) {
      return '[Empty document]';
    }
    
    return result.value.trim();
    
  } catch (error) {
    console.error('Error parsing .docx:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Parse .doc file (older format)
 * Note: mammoth primarily supports .docx, .doc support is limited
 */
async function parseDoc(filepath) {
  try {
    // Try mammoth first (it has some .doc support)
    const result = await mammoth.extractRawText({ path: filepath });
    
    if (result.value && result.value.trim().length > 0) {
      return result.value.trim();
    }
    
    // If mammoth fails, return error message
    return '[Unable to parse .doc file - please convert to .docx format for better support]';
    
  } catch (error) {
    console.error('Error parsing .doc:', error);
    return '[Unable to parse .doc file - please convert to .docx format for better support]';
  }
}

/**
 * Parse Excel file (.xlsx or .xls)
 * Converts to readable text format showing all sheets
 */
async function parseXlsx(filepath) {
  try {
    const workbook = XLSX.readFile(filepath);
    
    let output = [];
    
    // Process each sheet
    workbook.SheetNames.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      
      // Convert sheet to CSV format
      const csv = XLSX.utils.sheet_to_csv(sheet);
      
      if (csv.trim().length > 0) {
        output.push(`\n--- Sheet ${index + 1}: ${sheetName} ---\n`);
        output.push(csv);
      }
    });
    
    if (output.length === 0) {
      return '[Empty spreadsheet]';
    }
    
    return output.join('\n');
    
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error('Failed to extract data from spreadsheet');
  }
}

/**
 * Parse older .xls format
 */
async function parseXls(filepath) {
  // XLSX library handles both .xls and .xlsx
  return await parseXlsx(filepath);
}

/**
 * Parse plain text files (.txt, .md)
 */
async function parseText(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    
    if (!content || content.trim().length === 0) {
      return '[Empty file]';
    }
    
    return content.trim();
    
  } catch (error) {
    console.error('Error reading text file:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Get a summary of what can be extracted from a file type
 */
function getFileTypeCapabilities(mimeType) {
  const capabilities = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      name: 'Word Document (.docx)',
      extractsText: true,
      extractsFormatting: false,
      notes: 'Full text extraction with good accuracy'
    },
    'application/msword': {
      name: 'Word Document (.doc)',
      extractsText: true,
      extractsFormatting: false,
      notes: 'Limited support - recommend converting to .docx'
    },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
      name: 'Excel Spreadsheet (.xlsx)',
      extractsText: true,
      extractsFormatting: false,
      notes: 'Extracts all sheets as CSV format'
    },
    'application/vnd.ms-excel': {
      name: 'Excel Spreadsheet (.xls)',
      extractsText: true,
      extractsFormatting: false,
      notes: 'Extracts all sheets as CSV format'
    },
    'text/markdown': {
      name: 'Markdown (.md)',
      extractsText: true,
      extractsFormatting: false,
      notes: 'Direct text extraction'
    },
    'text/plain': {
      name: 'Text File (.txt)',
      extractsText: true,
      extractsFormatting: false,
      notes: 'Direct text extraction'
    }
  };
  
  return capabilities[mimeType] || null;
}

/**
 * Check if a MIME type is a parseable document
 */
function isParsableDocument(mimeType) {
  const parsable = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/markdown',
    'text/plain'
  ];
  
  return parsable.includes(mimeType);
}

module.exports = {
  parseDocument,
  isParsableDocument,
  getFileTypeCapabilities
};
