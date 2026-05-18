import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from playwright.async_api import async_playwright

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        print("Loading freelances.tn...")
        await page.goto("https://www.freelances.tn/projets", wait_until="domcontentloaded", timeout=40000)
        await asyncio.sleep(5)

        # Save full HTML to file
        html = await page.content()
        with open("debug_freelances.html", "w", encoding="utf-8") as f:
            f.write(html)
        print(f"HTML saved ({len(html)} chars)")

        # Print all unique classes found in the page
        classes = await page.evaluate("""
            () => {
                const all = document.querySelectorAll('[class]');
                const classes = new Set();
                all.forEach(el => {
                    el.className.split(' ').forEach(c => {
                        if (c && c.length > 2) classes.add(el.tagName + '.' + c);
                    });
                });
                return Array.from(classes).slice(0, 80);
            }
        """)
        print("\n=== CLASSES FOUND ===")
        for c in classes:
            print(c)

        # Count cards/articles
        counts = await page.evaluate("""
            () => {
                return {
                    articles: document.querySelectorAll('article').length,
                    cards: document.querySelectorAll('.card').length,
                    li: document.querySelectorAll('li[class]').length,
                    divs_with_class: document.querySelectorAll('div[class*="project"]').length,
                    divs_offer: document.querySelectorAll('div[class*="offer"]').length,
                    divs_item: document.querySelectorAll('div[class*="item"]').length,
                    all_links: document.querySelectorAll('a[href*="/projet"]').length,
                }
            }
        """)
        print("\n=== ELEMENT COUNTS ===")
        for k, v in counts.items():
            print(f"  {k}: {v}")

        await browser.close()

asyncio.run(debug())