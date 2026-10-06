"""Project source view for importers. Never write the built dist tree in source mode."""
from pathlib import Path
import tempfile


class WorkspaceView:
    def __init__(self, project):
        self.project = Path(project).resolve()
        self.sources = (self.project / 'src').is_dir()
        self.temporary = None
        if not self.sources:
            # Explicit portable output packs used by tools/tests retain their own layout.
            self.root = self.project / 'dist'
            return
        self.temporary = tempfile.TemporaryDirectory(prefix='emerald-inputs-')
        self.root = Path(self.temporary.name).resolve()
        self.origins = {}
        try:
            for directory in ('src', 'generated'):
                base = self.project / directory
                for source in base.rglob('*'):
                    if source.name == ".DS_Store" or source.name.startswith(".import-"):
                        continue
                    if source.is_symlink():
                        raise ValueError('Source symlink is not supported: ' + str(source))
                    if not source.is_file():
                        continue
                    relative = source.relative_to(base)
                    if relative in self.origins:
                        raise ValueError('Duplicate build input: ' + str(relative))
                    self.origins[relative] = source
                    target = self.root / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.symlink_to(source)
        except BaseException:
            self.close()
            raise

    def destination(self, path, generated=False):
        path = Path(path)
        relative = path.relative_to(self.root)
        if '..' in relative.parts:
            raise ValueError('Unsafe output path: ' + str(path))
        if not self.sources:
            return path
        if relative in self.origins:
            return self.origins[relative]
        return self.project / ('generated' if generated else 'src') / relative

    def close(self):
        temporary = getattr(self, 'temporary', None)
        if temporary:
            temporary.cleanup()

    def __del__(self):
        self.close()
