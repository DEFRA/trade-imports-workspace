import { copyFile, mkdir, stat, truncate } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@fixtures';
import { fileUploadPaths } from '@resources/file-upload/paths';
import { MAX_FILE_SIZE_BYTES, OVERSIZE_FILE_MESSAGE } from '@resources/file-upload/constants';
import { fileUploadTimeouts } from '@config/file-upload-timeouts';

const issueDate = '03/01/2026';
const maximumDocuments = 15;
const maximumDocumentsMessage = `You can add a maximum of ${maximumDocuments} documents`;

const paddedPdf = async (destination: string, bytes: number): Promise<string> => {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(fileUploadPaths.safeFile1kbPdf, destination);
  await truncate(destination, bytes);
  expect((await stat(destination)).size).toBe(bytes);
  return destination;
};

test.describe('Documents limits', { tag: ['@integration', '@duplicated-in-frontend'] }, () => {
  test('accepts a fifteenth document and rejects a sixteenth with the maximum-documents error', async ({ journey, pages }) => {
    test.slow();
    await journey.toAccompanyingDocuments();

    for (let index = 1; index <= maximumDocuments; index += 1) {
      const reference = `PWCAP${Date.now()}${index}`;
      await pages.accompanyingDocuments.fillDocument(reference, issueDate, fileUploadPaths.safeFile1kbPdf);
      await pages.accompanyingDocuments.saveAndAddAnother.click();
      await expect(pages.accompanyingDocuments.documentRow(reference)).toContainText('Check completed', {
        timeout: fileUploadTimeouts.virusScanComplete,
      });
    }

    await expect(pages.page.locator('#documents-added tbody tr')).toHaveCount(maximumDocuments);
    await expect(pages.accompanyingDocuments.saveAndAddAnother).toBeVisible();
    await expect(pages.page.locator('.govuk-error-summary')).toHaveCount(0);

    const sixteenthReference = `PWCAP${Date.now()}16`;
    await pages.accompanyingDocuments.fillDocument(sixteenthReference, issueDate, fileUploadPaths.safeFile1kbPdf);
    await pages.accompanyingDocuments.saveAndAddAnother.click();

    await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(pages.page.getByRole('link', { name: maximumDocumentsMessage })).toBeVisible();
    await expect(pages.page.locator('.govuk-error-message')).toHaveCount(0);
    await expect(pages.page.locator('#documents-added tbody tr')).toHaveCount(maximumDocuments);
    await expect(pages.accompanyingDocuments.documentRow(sixteenthReference)).toHaveCount(0);
  });

  test('accepts a 50MB PDF and rejects the same real file at one byte over', async ({ journey, pages }, testInfo) => {
    test.slow();
    const exact = await paddedPdf(testInfo.outputPath('boundary-exact.pdf'), MAX_FILE_SIZE_BYTES);
    const over = await paddedPdf(testInfo.outputPath('boundary-over.pdf'), MAX_FILE_SIZE_BYTES + 1);
    await journey.toAccompanyingDocuments();

    const exactReference = `PWEXACT${Date.now()}`;
    await pages.accompanyingDocuments.fillDocument(exactReference, issueDate, exact);
    await pages.accompanyingDocuments.saveAndAddAnother.click();

    await expect(pages.accompanyingDocuments.documentRow(exactReference)).toContainText('Check completed', {
      timeout: fileUploadTimeouts.virusScanComplete,
    });
    await expect(pages.page.locator('.govuk-error-summary')).toHaveCount(0);

    const overReference = `PWOVER${Date.now()}`;
    await pages.accompanyingDocuments.fillDocument(overReference, issueDate, over);
    await pages.accompanyingDocuments.saveAndAddAnother.click();

    await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(pages.page.getByRole('link', { name: OVERSIZE_FILE_MESSAGE })).toBeVisible();
    await expect(pages.page.locator('.govuk-error-message')).toHaveText(`Error: ${OVERSIZE_FILE_MESSAGE}`);
    await expect(pages.page.locator('#documents-added tbody tr')).toHaveCount(1);
    await expect(pages.accompanyingDocuments.documentRow(overReference)).toHaveCount(0);
  });
});
