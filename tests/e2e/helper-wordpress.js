async function loginToWordPress(page, resolvedBase, username, password) {
  await page.goto(`${resolvedBase}/wp-login.php`);
  await page.fill('#user_login', username);
  await page.fill('#user_pass', password);
  await page.click('#wp-submit');
  await page.waitForURL('**/wp-admin/**');
}

async function createPost(page, resolvedBase, titleText, contentText) {
  
  await page.goto(`${resolvedBase}/wp-admin/post-new.php`);
  const editorFrame = page.frameLocator('iframe[name="editor-canvas"]');
  const title = editorFrame.getByRole('textbox', { name: 'Add title' });

  await title.click();
  await title.fill(titleText);

  // Explicitly create first paragraph
  await title.press('Enter');

  // Type content directly (focus already correct)
  await page.keyboard.type(contentText);
}

module.exports = { loginToWordPress, createPost };