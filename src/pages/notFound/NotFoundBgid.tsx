import { Button, Result } from 'antd';
import React from 'react';
import PageLayout from '@/components/pageLayout';
import { useHistory } from 'react-router';

const NotFound: React.FC = () => {
  const history = useHistory();
  return (
    <PageLayout>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Result
            title='404'
            subTitle='出现错误。没有足够的业务组权限!'
            extra={
              <Button type='primary' onClick={() => history.replace('/')}>
                回到首页
              </Button>
            }
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default NotFound;
