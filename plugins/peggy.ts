import { createFilter } from '@rollup/pluginutils';
import Peggy from 'peggy';
import Path from 'path';
import Fs from 'fs';

export function peggy() {
  return {
    name: 'react-peggy',
    transform(code, id) {
      const filter = createFilter(/\.peggy$/);
      if (filter(id)) {
        const path = Path.resolve(Path.dirname(id), `${Path.basename(id)}.config.json`);
        let source;
        let parsed;
        try {
          source = Fs.readFileSync(path, 'utf8');
          parsed = JSON.parse(source);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return undefined;
          }

          throw error;
        }

        const result = Peggy.generate(code, {
          ...parsed,
          format: 'es',
          optimize: 'size',
          output: 'source',
        });
        return {
          code: result,
          map: null,
        };
      }
    },
  };
}
