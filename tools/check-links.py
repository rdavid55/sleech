"""Check local page links/scripts/styles without visiting external resources."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import sys
root=Path(__file__).resolve().parent.parent/'docs'
errors=[]
class Links(HTMLParser):
 def __init__(self,file):super().__init__();self.file=file
 def handle_starttag(self,tag,attrs):
  for key,value in attrs:
   if key not in ('href','src') or not value:continue
   url=urlsplit(value)
   if url.scheme or url.netloc or not url.path:continue
   target=(self.file.parent/unquote(url.path)).resolve()
   if not target.is_relative_to(root.resolve()) or not target.exists():errors.append(f'{self.file.relative_to(root)}: {value}')
for file in root.rglob('*.html'):Links(file).feed(file.read_text())
if errors:print('\n'.join(errors));sys.exit(1)
print('All local page resources and links exist.')
