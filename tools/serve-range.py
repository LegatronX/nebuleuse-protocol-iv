"""Serve the static game with HTTP byte ranges for streaming audio tests."""
import argparse
import http.server
import os
import re


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            file = open(path, 'rb')
        except OSError:
            self.send_error(404, 'File not found')
            return None
        size = os.fstat(file.fileno()).st_size
        match = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers.get('Range', ''))
        if match:
            first, last = match.groups()
            if not first and not last:
                match = None
            else:
                start = int(first) if first else max(0, size - int(last))
                end = min(size - 1, int(last)) if last and first else size - 1
                if start >= size or end < start:
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{size}')
                    self.end_headers()
                    file.close()
                    return None
        if not match:
            start, end = 0, size - 1
        self.send_response(206 if match else 200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if match:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        file.seek(start)
        self.remaining = end - start + 1
        return file

    def copyfile(self, source, outputfile):
        remaining = getattr(self, 'remaining', None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('port', type=int, nargs='?', default=8179)
    parser.add_argument('--bind', default='127.0.0.1')
    args = parser.parse_args()
    http.server.ThreadingHTTPServer((args.bind, args.port), RangeHandler).serve_forever()
