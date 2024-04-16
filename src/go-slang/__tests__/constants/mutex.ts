export const MUTEX_WITH_DEADLOCK_CODE = `
func hello(mu, wg) {
  mu.Lock()
  println(1)
  wg.Done()
}

func bye(mu, wg) {
  mu.Lock()
  println(100)
  wg.Done()
  mu.Unlock()
}

func main() {
  mu := new(sync.Mutex)
  wg := new(sync.WaitGroup)
  wg.Add(2)
  go hello(mu, wg)
  go bye(mu, wg)
  wg.Wait()
}`;