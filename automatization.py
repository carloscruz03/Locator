import re
import time
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("file:///H:/Mi%20unidad/Codes/Web/Locator/html/index.html")
    
    #Parte 1: Clickeo de botón
    page.get_by_role("textbox", name="Nombre").click()
    page.get_by_role("textbox", name="Nombre").fill("Carlos")
    time.sleep(2)

    #Parte 2: Clickeo de correo
    page.get_by_role("textbox", name="Correo").click()
    page.get_by_role("textbox", name="Correo").fill("cjjosue03@gmail.com")
    time.sleep(2)

    #Parte 3: Clickeo de lugar a buscar
    page.get_by_role("textbox", name="Lugar a buscar").click()
    page.get_by_role("textbox", name="Lugar a buscar").fill("McDonald's")
    time.sleep(2)

    #Agrandamiento de mapa
    page.get_by_role("button", name="Search").click()
    page.get_by_role("button", name="Zoom out").click()
    time.sleep(15)
    
    # ---------------------
    #context.close()
    #browser.close()


with sync_playwright() as playwright:
    run(playwright)
