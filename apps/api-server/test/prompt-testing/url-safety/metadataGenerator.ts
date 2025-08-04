/* eslint-disable */
import axios from 'axios';
import { load } from 'cheerio';
import { URL } from 'url';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

// 1. Point this to the existing promptfoo test file.
const INPUT_FILE_PATH = path.join(__dirname, 'config.yaml');

// 2. The script will save the updated results to this new file.
const OUTPUT_FILE_PATH = path.join(__dirname, 'config.updated.yaml');

async function getMetadata(url: string): Promise<{ title: string | null; description: string | null }> {
  try {
    let response;
    try {
      const headers = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      };
      response = await axios.get(`https://${url.replace(/^https?:\/\//, '')}`, {
        headers,
        timeout: 7000, // Increased timeout for reliability
        validateStatus: () => true,
      });
    } catch (error) {
      console.error(`  -> Network fetch failed for ${url}:`, error.message);
      return { title: null, description: null };
    }

    if (response.status === 401 || response.status === 403) {
      return { title: 'Login Required', description: null };
    }

    if (response.status < 200 || response.status >= 300) {
      return { title: null, description: null };
    }

    const $ = load(response.data);
    const scrapedTitle = $('head title').text().trim();
    const isLoginOrRedirectTitle = /sign in|log in|login|authentication|loading|redirecting/i.test(scrapedTitle);

    if (isLoginOrRedirectTitle) {
      const finalUrl = response.request.res.responseUrl || url;
      const originalHostname = new URL(`https://${url.replace(/^https?:\/\//, '')}`).hostname;
      const finalHostname = new URL(finalUrl).hostname;

      if (scrapedTitle.toLowerCase().includes('redirecting') || originalHostname !== finalHostname) {
        return { title: 'Login Required', description: null };
      }
    }

    const title = scrapedTitle || null;
    let description: string | null =
      $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || null;

    if (!description) {
      $('body script, body style').remove();
      const bodyText = $('body').text();
      description = bodyText;
    }

    // This function will strip any remaining HTML tags from a string.
    const stripHtml = (htmlString: string | null): string | null => {
      if (!htmlString) return null;
      // Use Cheerio to parse the string and get its clean text content.
      return load(htmlString).text();
    };

    const cleanDescription = stripHtml(description)?.replace(/\s+/g, ' ').trim() || null;
    const truncatedDescription = cleanDescription ? cleanDescription.slice(0, 500) : null;

    return { title, description: truncatedDescription };
  } catch (error) {
    console.error(`  -> Critical error in getMetadata for ${url}:`, error.message);
    return { title: null, description: null };
  }
}

// THIS IS THE MAIN SCRIPT LOGIC
async function generateAndSaveTestData() {
  console.log(`--- Reading test data from: ${INPUT_FILE_PATH} ---`);

  try {
    const fileContents = await fs.readFile(INPUT_FILE_PATH, 'utf8');
    const yamlData: any = yaml.load(fileContents);

    if (!yamlData || !Array.isArray(yamlData.tests)) {
      console.error('Error: Could not find a `tests` array in the YAML file.');
      return;
    }

    console.log(`Found ${yamlData.tests.length} test cases to process.`);

    for (const test of yamlData.tests) {
      if (!test.vars || !test.vars.url) {
        continue; // Skip tests that don't have a URL
      }

      const { url, tab_title: clientTabTitle, meta_description: clientMetaDescription } = test.vars;
      console.log(`\nProcessing URL: ${url}`);

      const fetchedMetadata = await getMetadata(url);

      // This perfectly simulates the logic in your checkIfUrlIsSafeToUse function
      let finalTitle = fetchedMetadata.title || clientTabTitle || '';
      let finalDescription = fetchedMetadata.description || clientMetaDescription || '';

      if (fetchedMetadata.title === 'Login Required') {
        finalTitle = clientTabTitle || 'Sign in to your account';
        finalDescription = 'This page requires you to sign in to view its content.';
      }

      const junkJsPattern = /(\(function\s?\(\)\s?\{.*\})|({.*})|(\w+\s?\(\)\s?;)/g;
      if (finalDescription && junkJsPattern.test(finalDescription)) {
        finalDescription = finalDescription.replace(junkJsPattern, ' [filtered script content] ').trim();
      }

      console.log(`  -> Old Title: "${clientTabTitle}"`);
      console.log(`  -> New Title: "${finalTitle}"`);
      console.log(`  -> Old Desc: "${(clientMetaDescription || '').substring(0, 50)}..."`);
      console.log(`  -> New Desc: "${(finalDescription || '').substring(0, 50)}..."`);

      // Update the test case object in place
      test.vars.tab_title = finalTitle;
      test.vars.meta_description = finalDescription;
    }

    // Convert the modified JavaScript object back to a YAML string
    const newYamlString = yaml.dump(yamlData, { lineWidth: -1 }); // -1 prevents line wrapping

    // Write the new YAML to the output file
    await fs.writeFile(OUTPUT_FILE_PATH, newYamlString, 'utf8');

    console.log(`\n--- Finished! ---`);
    console.log(`Updated test suite saved to: ${OUTPUT_FILE_PATH}`);
    console.log(`\nNext steps:`);
    console.log(`1. Review the new file: code ${OUTPUT_FILE_PATH}`);
    console.log(`2. If the changes look good, replace your original file.`);
  } catch (e) {
    console.error('An error occurred:', e);
  }
}

generateAndSaveTestData();
