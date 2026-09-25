import { build } from 'vite'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const outDir = path.resolve(rootDir, '.test-dist')

async function run() {
  try {
    // 1. Compilar o arquivo de testes e suas dependências usando Vite (SSR mode)
    await build({
      root: rootDir,
      configFile: false,
      build: {
        ssr: path.resolve(rootDir, 'src/services/core-access.test.ts'),
        outDir,
        emptyOutDir: true,
        target: 'node18',
        rollupOptions: {
          output: {
            format: 'esm',
            entryFileNames: 'test-bundle.mjs',
          },
        },
      },
      resolve: {
        alias: [
          {
            find: '@',
            replacement: path.resolve(rootDir, 'src'),
          },
        ],
      },
      define: {
        'import.meta.env.DEV': JSON.stringify(false),
      },
      logLevel: 'error',
    })

    // 2. Importar o módulo compilado e executar a suite de testes
    const testBundlePath = path.resolve(outDir, 'test-bundle.mjs')
    const testModule = await import(pathToFileURL(testBundlePath).href)

    if (typeof testModule.runCoreAccessTests !== 'function') {
      console.error('Erro: runCoreAccessTests não encontrado no módulo de testes.')
      process.exit(1)
    }

    const result = testModule.runCoreAccessTests()

    console.log(`\n========================================`)
    console.log(`Resultados dos testes de core-access:`)
    console.log(`Passaram: ${result.passed}`)
    console.log(`Falharam: ${result.failed}`)
    console.log(`========================================\n`)

    if (result.failed > 0) {
      console.error('Erros encontrados:')
      result.errors.forEach((err, idx) => {
        console.error(`  ${idx + 1}. ${err}`)
      })
      process.exit(1)
    } else {
      console.log(`Todos os ${result.passed} cenários de teste passaram com sucesso!`)
    }
  } catch (err) {
    console.error('Falha ao compilar ou executar os testes:', err)
    process.exit(1)
  } finally {
    // Limpar diretório temporário
    try {
      if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true })
      }
    } catch {
      // Ignorar erro de limpeza
    }
  }
}

run()
