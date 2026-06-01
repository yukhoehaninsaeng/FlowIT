# useEffect 없이 해결하는 패턴 모음

출처: https://react.dev/learn/you-might-not-need-an-effect

---

## 1. Adjusting state based on props or state

props나 state로부터 계산 가능한 값은 state로 두지 않는다.

```tsx
// ❌
function Form() {
  const [firstName, setFirstName] = useState('Taylor');
  const [lastName, setLastName] = useState('Swift');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    setFullName(firstName + ' ' + lastName);
  }, [firstName, lastName]);
}

// ✅
function Form() {
  const [firstName, setFirstName] = useState('Taylor');
  const [lastName, setLastName] = useState('Swift');
  const fullName = firstName + ' ' + lastName; // 렌더 중 계산
}
```

---

## 2. Caching expensive calculations

```tsx
// ❌
function TodoList({ todos, filter }) {
  const [visibleTodos, setVisibleTodos] = useState([]);
  useEffect(() => {
    setVisibleTodos(getFilteredTodos(todos, filter));
  }, [todos, filter]);
}

// ✅
function TodoList({ todos, filter }) {
  const visibleTodos = useMemo(
    () => getFilteredTodos(todos, filter),
    [todos, filter]
  );
}
```

---

## 3. Resetting state when a prop changes

```tsx
// ❌
export default function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');

  useEffect(() => {
    setComment('');
  }, [userId]);
}

// ✅ key prop으로 컴포넌트 자체를 리셋
export default function ProfilePage({ userId }) {
  return <Profile userId={userId} key={userId} />;
}

function Profile({ userId }) {
  const [comment, setComment] = useState('');
  // userId가 바뀌면 key가 바뀌어서 컴포넌트 자체가 새로 마운트됨
}
```

---

## 4. Sharing logic between event handlers

```tsx
// ❌ 이벤트 핸들러에서 처리할 수 있는 것을 effect로 처리
function ProductPage({ product, addToCart }) {
  useEffect(() => {
    if (product.isInCart) {
      showNotification(`Added ${product.name} to the cart!`);
    }
  }, [product]);

  function handleBuyClick() {
    addToCart(product);
  }
}

// ✅ 이벤트 핸들러에서 직접 처리
function ProductPage({ product, addToCart }) {
  function handleBuyClick() {
    addToCart(product);
    showNotification(`Added ${product.name} to the cart!`);
  }
}
```

---

## 5. Sending a POST request

```tsx
// ❌
function Form() {
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) {
      post('/api/register', { firstName, lastName });
    }
  }, [submitted]);
}

// ✅ 이벤트 핸들러에서 직접 호출
function Form() {
  function handleSubmit(e) {
    e.preventDefault();
    post('/api/register', { firstName, lastName });
  }
}
```

---

## 6. Initializing the application (한 번만 실행)

```tsx
// ❌
function App() {
  useEffect(() => {
    loadDataFromLocalStorage();
    checkAuthToken();
  }, []);
}

// ✅ 모듈 수준에서 실행
let didInit = false;

function App() {
  useEffect(() => {
    if (!didInit) {
      didInit = true;
      loadDataFromLocalStorage();
      checkAuthToken();
    }
  }, []);
}

// 또는 컴포넌트 바깥에서 직접 실행
loadDataFromLocalStorage();
checkAuthToken();

function App() { ... }
```

---

## 7. Passing data to the parent

```tsx
// ❌ 자식이 부모 state를 effect로 업데이트
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  useEffect(() => {
    onChange(isOn);
  }, [isOn, onChange]);
}

// ✅ 이벤트 핸들러에서 직접 호출
function Toggle({ onChange }) {
  const [isOn, setIsOn] = useState(false);

  function handleClick() {
    const nextIsOn = !isOn;
    setIsOn(nextIsOn);
    onChange(nextIsOn); // 동시에 처리
  }
}
```

---

## 언제 useEffect가 진짜 필요한가

| 상황 | 패턴 |
|---|---|
| DOM 직접 조작 | `useEffect` + `ref` |
| 외부 이벤트 구독 | `useEffect` + cleanup |
| WebSocket 연결 | `useEffect` + cleanup |
| 타이머 | `useEffect` + cleanup |
| 애니메이션 트리거 | `useEffect` + `ref` |

모든 경우에 cleanup 함수를 반드시 작성할 것.
