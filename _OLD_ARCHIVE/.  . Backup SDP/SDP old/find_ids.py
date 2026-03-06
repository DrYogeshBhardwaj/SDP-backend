
import re

with open(r'c:\SinaankProjects\SSB\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

ids = re.findall(r'id=["\']([^"\']+)["\']', content)
for i in ids:
    print(i)
